import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HomePage from "@/pages/HomePage";
import JobSearchPage from "@/pages/JobSearchPage";
import SkillsDashboardPage from "@/pages/SkillsDashboardPage";
import RoleTrendsPage from "@/pages/RoleTrendsPage";
import CompanyComparisonPage from "@/pages/CompanyComparisonPage";
import SkillsGapPage from "@/pages/SkillsGapPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";

function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--parchment)' }}>
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<JobSearchPage />} />
            <Route path="/skills" element={<SkillsDashboardPage />} />
            <Route path="/trends" element={<RoleTrendsPage />} />
            <Route path="/companies" element={<CompanyComparisonPage />} />
            <Route path="/skills-gap" element={<SkillsGapPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
