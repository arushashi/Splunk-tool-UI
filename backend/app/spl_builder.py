from typing import List, Optional


def _quote(value: str) -> str:
    return '"' + value.replace('"', '\\"') + '"'


def build_spl(
    indexes: List[str],
    log_levels: List[str],
    level_field: str,
    keyword: Optional[str] = None,
) -> str:
    """
    Build an SPL query from the structured filters chosen in the UI.

    Produces something like:
        search (index=1003865 OR index=1003866) (log_level=ERROR OR log_level=WARN) "timeout"
        | sort - _time
    """
    if not indexes:
        raise ValueError("At least one index is required.")

    index_clause = " OR ".join(f"index={idx}" for idx in indexes)
    clauses = [f"({index_clause})"]

    if log_levels:
        level_clause = " OR ".join(f"{level_field}={level}" for level in log_levels)
        clauses.append(f"({level_clause})")

    if keyword:
        clauses.append(_quote(keyword))

    spl = "search " + " ".join(clauses) + "\n| sort - _time"
    return spl
