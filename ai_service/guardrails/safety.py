import re
from typing import List, Tuple, Set, Optional, Dict, Any

# Common prompt injection signatures
INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions",
    r"disregard\s+(all\s+)?(previous|prior|above)\s+instructions",
    r"system\s*:\s*you\s+are\s+now",
    r"you\s+are\s+now\s+in\s+DAN\s+mode",
    r"reveal\s+(your\s+)?(system\s+prompt|secret\s+instructions)",
    r"bypass\s+(all\s+)?security\s+(controls|rules|guidelines)",
    r"override\s+tenant\s+isolation",
    r"print\s+API_KEY",
    r"exfiltrate\s+database",
    r"act\s+as\s+an\s+unfiltered\s+AI",
]

SECRET_PATTERNS = [
    r"AIzaSy[0-9A-Za-z_-]{33}",                # Google API Key
    r"sk-[a-zA-Z0-9]{32,}",                   # Generic API keys / OpenAI
    r"ghp_[a-zA-Z0-9]{36}",                   # GitHub Personal Token
    r"bearer\s+[a-zA-Z0-9_\-\.]{30,}",        # Bearer tokens
    r"postgres://[^\s]+:[^\s]+@[^\s]+",      # Database URLs with passwords
]

class SafetyGuardrail:
    @staticmethod
    def inspect_prompt(prompt: str) -> Tuple[bool, Optional[str]]:
        """
        Returns (is_safe, violation_reason)
        """
        if not prompt:
            return True, None

        for pattern in INJECTION_PATTERNS:
            if re.search(pattern, prompt, re.IGNORECASE):
                return False, f"Prompt blocked: Detected suspicious instruction override attempt ('{pattern}')"

        return True, None

    @staticmethod
    def validate_tool_permissions(requested_tool: str, allowed_tools: Set[str]) -> Tuple[bool, Optional[str]]:
        """
        Enforce strict tool allowlist
        """
        if requested_tool not in allowed_tools:
            return False, f"Unauthorized tool call: Tool '{requested_tool}' is not in the agent's approved allowlist."
        return True, None

    @staticmethod
    def sanitize_output(output_text: str) -> str:
        """
        Redacts credentials, secrets, and raw connection strings from LLM output
        """
        sanitized = output_text
        for pattern in SECRET_PATTERNS:
            sanitized = re.sub(pattern, "[REDACTED_CREDENTIAL]", sanitized, flags=re.IGNORECASE)
        return sanitized

    @staticmethod
    def validate_spending_limits(
        current_tokens_used: int,
        requested_tokens: int,
        max_quota: int
    ) -> Tuple[bool, Optional[str]]:
        if current_tokens_used + requested_tokens > max_quota:
            return False, f"Quota exceeded: Execution would exceed organization token limit ({current_tokens_used + requested_tokens} > {max_quota})."
        return True, None
