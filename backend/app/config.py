from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    splunk_host: str = "localhost"
    splunk_port: int = 8089
    splunk_scheme: str = "https"
    splunk_verify_ssl: bool = True

    splunk_username: str = ""
    splunk_password: str = ""

    # The field in the log source that carries the level/severity. Configurable
    # because environments differ: "level", "severity", "log_level", etc.
    splunk_level_field: str = "log_level"

    splunk_default_indexes: str = ""

    splunk_connect_timeout: float = 5.0
    splunk_read_timeout: float = 30.0

    frontend_origin: str = "http://localhost:5173"

    @property
    def splunk_base_url(self) -> str:
        return f"{self.splunk_scheme}://{self.splunk_host}:{self.splunk_port}"

    @property
    def default_indexes_list(self) -> List[str]:
        return [i.strip() for i in self.splunk_default_indexes.split(",") if i.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
