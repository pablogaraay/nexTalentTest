import requests
import sys
import json
from datetime import datetime

class NexTalentAPITester:
    def __init__(self, base_url="https://talent-analytics-17.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}" if not endpoint.startswith('/') else f"{self.base_url}{endpoint}"
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url)
            elif method == 'POST':
                if files:
                    response = self.session.post(url, data=data, files=files)
                else:
                    response = self.session.post(url, json=data)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response keys: {list(response_data.keys()) if isinstance(response_data, dict) else 'Non-dict response'}")
                except:
                    print("   Response: Non-JSON")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })

            return success, response.json() if success and response.content else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_health_check(self):
        """Test API health check"""
        return self.run_test("Health Check", "GET", "", 200)

    def test_auth_register(self):
        """Test user registration"""
        test_user_data = {
            "email": f"test_user_{datetime.now().strftime('%H%M%S')}@example.com",
            "password": "TestPass123!",
            "name": "Test User"
        }
        success, response = self.run_test("User Registration", "POST", "auth/register", 200, test_user_data)
        if success:
            self.test_user_email = test_user_data["email"]
            self.test_user_password = test_user_data["password"]
        return success, response

    def test_auth_login(self):
        """Test user login with admin credentials"""
        login_data = {
            "email": "admin@example.com",
            "password": "admin123"
        }
        return self.run_test("Admin Login", "POST", "auth/login", 200, login_data)

    def test_auth_me(self):
        """Test get current user"""
        return self.run_test("Get Current User", "GET", "auth/me", 200)

    def test_job_search_text(self):
        """Test job search with text prompt"""
        search_data = {"prompt": "Python developer"}
        return self.run_test("Job Search - Text", "POST", "jobs/search", 200, search_data)

    def test_job_search_cv(self):
        """Test job search with CV upload"""
        # Create a mock CV file
        cv_content = b"John Doe\nSoftware Engineer\nSkills: Python, React, SQL"
        files = {"cv_file": ("test_cv.txt", cv_content, "text/plain")}
        return self.run_test("Job Search - CV Upload", "POST", "jobs/search", 200, files=files)

    def test_offers_compare(self):
        """Test offer comparison"""
        compare_data = {"offer_ids": ["offer-001", "offer-002"]}
        return self.run_test("Offer Comparison", "POST", "offers/compare", 200, compare_data)

    def test_skills_demand(self):
        """Test skills demand endpoint"""
        return self.run_test("Skills Demand", "GET", "skills/demand", 200)

    def test_role_trends(self):
        """Test role trends endpoint"""
        return self.run_test("Role Trends", "GET", "trends/roles", 200)

    def test_companies_compare(self):
        """Test companies comparison endpoint"""
        return self.run_test("Companies Data", "GET", "companies/compare", 200)

    def test_skills_gap_analysis(self):
        """Test skills gap analysis"""
        gap_data = {
            "user_skills": ["Python", "React", "SQL"],
            "target_role": "Frontend Developer"
        }
        return self.run_test("Skills Gap Analysis", "POST", "skills/gap", 200, gap_data)

    def test_skills_gap_roles(self):
        """Test available roles for skills gap"""
        return self.run_test("Available Roles", "GET", "skills/gap/roles", 200)

def main():
    print("🚀 Starting nexTalent API Testing...")
    tester = NexTalentAPITester()

    # Test health check first
    print("\n" + "="*50)
    print("HEALTH CHECK")
    print("="*50)
    tester.test_health_check()

    # Test authentication
    print("\n" + "="*50)
    print("AUTHENTICATION TESTS")
    print("="*50)
    tester.test_auth_register()
    tester.test_auth_login()
    tester.test_auth_me()

    # Test job search
    print("\n" + "="*50)
    print("JOB SEARCH TESTS")
    print("="*50)
    tester.test_job_search_text()
    tester.test_job_search_cv()
    tester.test_offers_compare()

    # Test skills and trends
    print("\n" + "="*50)
    print("SKILLS & TRENDS TESTS")
    print("="*50)
    tester.test_skills_demand()
    tester.test_role_trends()
    tester.test_companies_compare()

    # Test skills gap
    print("\n" + "="*50)
    print("SKILLS GAP TESTS")
    print("="*50)
    tester.test_skills_gap_analysis()
    tester.test_skills_gap_roles()

    # Print final results
    print("\n" + "="*50)
    print("FINAL RESULTS")
    print("="*50)
    print(f"📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"📈 Success rate: {success_rate:.1f}%")

    if tester.failed_tests:
        print(f"\n❌ Failed tests ({len(tester.failed_tests)}):")
        for i, failure in enumerate(tester.failed_tests, 1):
            print(f"  {i}. {failure['test']}")
            if 'error' in failure:
                print(f"     Error: {failure['error']}")
            else:
                print(f"     Expected: {failure['expected']}, Got: {failure['actual']}")

    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())