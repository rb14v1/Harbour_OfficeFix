import re

from django.core.validators import RegexValidator

# Python's re module: [^\W\d_] matches any Unicode letter, [^\W_] matches any Unicode letter or digit.
EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
NAME_PATTERN = r"^(?:[^\W\d_]|[ .'\-])+$"
TEXT_PATTERN = r"^(?:[^\W_]|[ .,\-()/&'#])+$"

EMAIL_VALIDATOR = RegexValidator(re.compile(EMAIL_PATTERN), "Enter a valid email address.")
NAME_VALIDATOR = RegexValidator(
    re.compile(NAME_PATTERN),
    "may contain only letters, spaces, hyphens (-), apostrophes (') and periods (.).",
)
TEXT_VALIDATOR = RegexValidator(
    re.compile(TEXT_PATTERN),
    "may contain only letters, numbers, spaces and . , - ( ) / & ' #.",
)
