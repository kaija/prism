"""
Locust performance test for Event Ingest API.

Simulates realistic traffic with randomly generated events of different types:
- Track events (page_view, click, form_submit, purchase, search, etc.)
- Profile update events
- GET-based pixel/redirect tracking

Usage:
    # Headless (CLI)
    locust -f tests/performance/locustfile.py --headless \
        -u 100 -r 10 --run-time 60s --host http://localhost:8080

    # Web UI
    locust -f tests/performance/locustfile.py --host http://localhost:8080
"""

import random
import string
import time
import uuid

from locust import HttpUser, between, task, tag


# ── Random data generators ───────────────────────────────────────────

PAGES = [
    "/", "/home", "/pricing", "/about", "/docs", "/blog",
    "/dashboard", "/settings", "/profile", "/checkout",
    "/products", "/products/123", "/products/456/reviews",
    "/search", "/login", "/signup", "/contact", "/faq",
]

REFERRERS = [
    "google.com", "twitter.com", "facebook.com", "linkedin.com",
    "reddit.com", "hackernews.com", "direct", "email", "ads.google.com",
    None,
]

BROWSERS = ["Chrome", "Firefox", "Safari", "Edge", "Opera", "Mobile Safari"]
OS_LIST = ["macOS", "Windows", "Linux", "iOS", "Android"]
COUNTRIES = ["US", "GB", "DE", "JP", "BR", "IN", "FR", "CA", "AU", "KR"]
PLANS = ["free", "starter", "pro", "enterprise"]
BUTTON_NAMES = ["signup", "login", "cta_hero", "add_to_cart", "checkout", "subscribe", "download"]
SEARCH_TERMS = ["analytics", "dashboard", "pricing", "api docs", "integration", "sdk", "events"]
CURRENCIES = ["USD", "EUR", "GBP", "JPY", "BRL"]
ITEM_NAMES = ["Pro Plan", "Enterprise Plan", "API Credits", "Data Export", "Custom Domain"]


def rand_str(length=8):
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=length))


def rand_project_id():
    return random.choice([f"proj_{rand_str(6)}" for _ in range(5)])


def rand_profile_id():
    return f"user_{random.randint(1, 10000)}"


def rand_props_page_view():
    return {
        "page": random.choice(PAGES),
        "referrer": random.choice(REFERRERS),
        "browser": random.choice(BROWSERS),
        "os": random.choice(OS_LIST),
        "screen_width": random.choice([375, 768, 1024, 1280, 1440, 1920]),
        "session_id": str(uuid.uuid4()),
        "duration_ms": random.randint(100, 30000),
    }


def rand_props_click():
    return {
        "button": random.choice(BUTTON_NAMES),
        "page": random.choice(PAGES),
        "element_id": f"btn-{rand_str(4)}",
        "x": random.randint(0, 1920),
        "y": random.randint(0, 1080),
    }


def rand_props_form_submit():
    return {
        "form_name": random.choice(["signup", "login", "contact", "newsletter", "feedback"]),
        "page": random.choice(PAGES),
        "field_count": random.randint(2, 10),
        "success": random.choice([True, False]),
        "duration_ms": random.randint(500, 60000),
    }


def rand_props_purchase():
    return {
        "item": random.choice(ITEM_NAMES),
        "amount": round(random.uniform(9.99, 999.99), 2),
        "currency": random.choice(CURRENCIES),
        "quantity": random.randint(1, 5),
        "coupon": random.choice([None, "SAVE10", "WELCOME20", "BF50"]),
        "payment_method": random.choice(["card", "paypal", "apple_pay", "google_pay"]),
    }


def rand_props_search():
    return {
        "query": random.choice(SEARCH_TERMS),
        "results_count": random.randint(0, 500),
        "page": random.randint(1, 10),
        "filter_applied": random.choice([True, False]),
    }


def rand_props_error():
    return {
        "error_code": random.choice(["E001", "E002", "E403", "E404", "E500"]),
        "message": f"Something went wrong: {rand_str(12)}",
        "page": random.choice(PAGES),
        "stack_hash": rand_str(16),
    }


def rand_props_custom():
    """Generate a random custom event with arbitrary props."""
    num_props = random.randint(1, 8)
    props = {}
    for _ in range(num_props):
        key = f"attr_{rand_str(4)}"
        val_type = random.choice(["str", "int", "float", "bool"])
        if val_type == "str":
            props[key] = rand_str(random.randint(3, 20))
        elif val_type == "int":
            props[key] = random.randint(-1000, 100000)
        elif val_type == "float":
            props[key] = round(random.uniform(-100, 10000), 3)
        else:
            props[key] = random.choice([True, False])
    return props


EVENT_GENERATORS = {
    "page_view": rand_props_page_view,
    "click": rand_props_click,
    "form_submit": rand_props_form_submit,
    "purchase": rand_props_purchase,
    "search": rand_props_search,
    "error": rand_props_error,
}

CUSTOM_EVENT_NAMES = [
    "video_play", "video_pause", "file_download", "share",
    "notification_click", "tab_switch", "scroll_depth",
    "feature_flag_eval", "experiment_exposure", "api_call",
]


def build_track_event():
    """Build a random track event payload."""
    if random.random() < 0.7:
        event_name = random.choice(list(EVENT_GENERATORS.keys()))
        props = EVENT_GENERATORS[event_name]()
    else:
        event_name = random.choice(CUSTOM_EVENT_NAMES)
        props = rand_props_custom()

    payload = {
        "event_name": event_name,
        "project_id": rand_project_id(),
        "profile_id": rand_profile_id(),
        "props": props,
    }

    # 50% chance to include client timestamp
    if random.random() < 0.5:
        payload["cts"] = int(time.time() * 1000) - random.randint(0, 5000)

    # 20% chance to include client-generated event_id
    if random.random() < 0.2:
        payload["event_id"] = str(uuid.uuid4())

    return payload


def build_profile_event():
    """Build a random profile update payload."""
    props = {
        "name": f"User {rand_str(5).title()}",
        "plan": random.choice(PLANS),
        "country": random.choice(COUNTRIES),
        "signup_source": random.choice(["organic", "referral", "paid", "social"]),
    }

    # Add some random extra profile attributes
    if random.random() < 0.5:
        props["company"] = f"{rand_str(6).title()} Inc."
    if random.random() < 0.3:
        props["role"] = random.choice(["developer", "pm", "designer", "executive", "data_analyst"])
    if random.random() < 0.4:
        props["lifetime_value"] = round(random.uniform(0, 50000), 2)

    return {
        "event_name": "profile",
        "project_id": rand_project_id(),
        "profile_id": rand_profile_id(),
        "props": props,
    }


def build_get_query_params():
    """Build random query params for GET /ingest with e_/p_ prefixes."""
    event_name = random.choice(list(EVENT_GENERATORS.keys()))
    params = {
        "event_name": event_name,
        "project_id": rand_project_id(),
        "profile_id": rand_profile_id(),
    }

    # Add e_ prefixed event props
    num_event_props = random.randint(1, 5)
    for _ in range(num_event_props):
        key = f"e_{rand_str(4)}"
        params[key] = rand_str(random.randint(3, 12))

    # 30% chance to add p_ prefixed profile props
    if random.random() < 0.3:
        num_profile_props = random.randint(1, 3)
        for _ in range(num_profile_props):
            key = f"p_{rand_str(4)}"
            params[key] = rand_str(random.randint(3, 10))

    # 40% chance to include cts
    if random.random() < 0.4:
        params["cts"] = str(int(time.time() * 1000))

    return params


# ── Locust User ──────────────────────────────────────────────────────

class IngestApiUser(HttpUser):
    """
    Simulates a client sending analytics events to the Ingest API.

    Traffic mix (approximate):
    - 60% POST track events (various types)
    - 15% POST profile updates
    - 15% GET pixel/redirect tracking
    -  5% validation error (bad payloads)
    -  5% health checks
    """

    wait_time = between(0.01, 0.1)  # aggressive for perf testing

    @tag("track", "post")
    @task(60)
    def post_track_event(self):
        """POST a randomly generated track event."""
        payload = build_track_event()
        with self.client.post(
            "/ingest",
            json=payload,
            name=f"POST /ingest [{payload['event_name']}]",
            catch_response=True,
        ) as resp:
            if resp.status_code == 202:
                resp.success()
            else:
                resp.failure(f"Expected 202, got {resp.status_code}: {resp.text}")

    @tag("profile", "post")
    @task(15)
    def post_profile_event(self):
        """POST a randomly generated profile update."""
        payload = build_profile_event()
        with self.client.post(
            "/ingest",
            json=payload,
            name="POST /ingest [profile]",
            catch_response=True,
        ) as resp:
            if resp.status_code == 202:
                resp.success()
            else:
                resp.failure(f"Expected 202, got {resp.status_code}: {resp.text}")

    @tag("track", "get")
    @task(15)
    def get_track_event(self):
        """GET /ingest with query params (pixel/redirect tracking)."""
        params = build_get_query_params()
        with self.client.get(
            "/ingest",
            params=params,
            name="GET /ingest [query]",
            catch_response=True,
        ) as resp:
            if resp.status_code == 202:
                resp.success()
            else:
                resp.failure(f"Expected 202, got {resp.status_code}: {resp.text}")

    @tag("error")
    @task(5)
    def post_invalid_event(self):
        """POST an invalid payload to test validation path."""
        bad_payloads = [
            {},  # missing everything
            {"event_name": "", "project_id": "p1"},  # empty event_name
            {"event_name": "x" * 200, "project_id": "p1"},  # event_name too long
            {"event_name": "test"},  # missing project_id
            {"project_id": "p1"},  # missing event_name
        ]
        payload = random.choice(bad_payloads)
        with self.client.post(
            "/ingest",
            json=payload,
            name="POST /ingest [invalid]",
            catch_response=True,
        ) as resp:
            if resp.status_code == 400:
                resp.success()
            else:
                resp.failure(f"Expected 400, got {resp.status_code}: {resp.text}")

    @tag("health")
    @task(5)
    def health_check(self):
        """GET /healthz baseline."""
        self.client.get("/healthz", name="GET /healthz")
