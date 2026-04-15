import json
from typing import Any, Dict, List
from groq import Groq

try:
    from config import Config
except ModuleNotFoundError:
    import sys
    from pathlib import Path
    BASE_DIR = Path(__file__).resolve().parent.parent
    if str(BASE_DIR) not in sys.path:
        sys.path.insert(0, str(BASE_DIR))
    from config import Config

# Try importing ollama, but don't fail if unavailable
_OLLAMA_AVAILABLE = False
try:
    import ollama
    # Quick check if ollama server is running
    ollama.list()
    _OLLAMA_AVAILABLE = True
except Exception:
    _OLLAMA_AVAILABLE = False
    print("[llm_client] Ollama no disponible. Se usara fallback sin busqueda vectorial.")

def _require_llm(client):
    if not client:
        raise RuntimeError("No hay cliente LLM disponible. Revisa GROQ_API_KEY en el entorno.")

def parse_first_json_object(text: str) -> Dict[str, Any]:
    content = (text or "").strip()
    start = content.find("{")
    end = content.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No se encontro JSON valido en la respuesta del LLM.")
    return json.loads(content[start:end + 1])

class LLMClientService:
    def __init__(self):
        self.llm_client = Groq(api_key=Config.GROQ_API_KEY) if Config.GROQ_API_KEY else None
        self.ollama_available = _OLLAMA_AVAILABLE

    def embed_text(self, text: str) -> List[float]:
        """Embed text using Ollama. Returns empty list if Ollama is unavailable."""
        if not self.ollama_available:
            return []
        try:
            res = ollama.embed(
                model=Config.EMBED_MODEL,
                input=text
            )
            return res['embeddings'][0]
        except Exception as exc:
            print(f"[llm_client] Error en embed_text: {exc}")
            return []

    def call_structured_extraction(self, system_prompt: str, user_prompt: str, schema: dict) -> Dict[str, Any]:
        _require_llm(self.llm_client)
        response = self.llm_client.chat.completions.create(
            model=Config.PROFILE_LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.0,
            response_format={
                "type": "json_schema",
                "json_schema": {"name": "extraction_parser", "strict": True, "schema": schema}
            }
        )
        content = response.choices[0].message.content or "{}"
        return json.loads(content)

    def call_reranker(self, prompt_json: dict, top_n: int) -> List[Dict[str, Any]]:
        _require_llm(self.llm_client)
        schema = {
            "type": "object",
            "properties": {
                "ranked": {
                    "type": "array",
                    "maxItems": int(top_n),
                    "items": {
                        "type": "object",
                        "properties": {
                            "offer_id": {"type": "string"},
                            "score": {"type": "number", "minimum": 0, "maximum": 1},
                            "matched_skills": {"type": "array", "items": {"type": "string"}}
                        },
                        "required": ["offer_id", "score", "matched_skills"],
                        "additionalProperties": False
                    }
                }
            },
            "required": ["ranked"],
            "additionalProperties": False
        }

        try:
            response = self.llm_client.chat.completions.create(
                model=Config.PROFILE_LLM_MODEL,
                messages=[
                    {"role": "system", "content": "Eres un motor de reranking final de ofertas. Responde solo con un JSON valido."},
                    {"role": "user", "content": json.dumps(prompt_json, ensure_ascii=False)}
                ],
                temperature=0.0,
                response_format={
                    "type": "json_schema",
                    "json_schema": {"name": "reranker_output", "strict": True, "schema": schema}
                }
            )
            content = response.choices[0].message.content or ""
            return parse_first_json_object(content).get("ranked", []) or []
        except Exception as exc:
            print(f"Reranking error (schema): {exc}")

        try:
            response = self.llm_client.chat.completions.create(
                model=Config.PROFILE_LLM_MODEL,
                messages=[
                    {"role": "system", "content": "Devuelve solo un JSON valido con key 'ranked'."},
                    {"role": "user", "content": json.dumps(prompt_json, ensure_ascii=False)}
                ],
                temperature=0.0,
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content or ""
            return parse_first_json_object(content).get("ranked", []) or []
        except Exception as exc:
            print(f"Reranking error (json_object): {exc}")
            return []
