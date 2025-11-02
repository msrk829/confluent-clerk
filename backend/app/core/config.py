"""
Application Configuration
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings"""
    
    # Project Info
    PROJECT_NAME: str = "Kafka Admin Portal"
    VERSION: str = "1.0.0"
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/kafka_admin"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost:80",
        "http://localhost"
    ]
    
    # LDAP Configuration
    LDAP_SERVER: str = "ldap://ldapnode.infra.alephys.com:389"
    LDAP_BASE_DN: str = "cn=users,cn=accounts,dc=alephys,dc=com"
    LDAP_USER_DN_TEMPLATE: str = "uid={username},cn=users,cn=accounts,dc=alephys,dc=com"
    LDAP_ADMIN_GROUP: str = "cn=admins,cn=groups,cn=accounts,dc=alephys,dc=com"
    LDAP_BIND_DN: str = "uid=admin,cn=users,cn=accounts,dc=alephys,dc=com"
    LDAP_BIND_PASSWORD: str = "admin_password"
    
    # Kafka Configuration
    KAFKA_BOOTSTRAP_SERVERS: str = "avinashnode.infra.alephys.com:12091,avinashnode.infra.alephys.com:12092"
    KAFKA_SECURITY_PROTOCOL: str = "PLAINTEXT"
    
    @property
    def kafka_bootstrap_servers_list(self) -> List[str]:
        """Convert comma-separated string to list"""
        return [server.strip() for server in self.KAFKA_BOOTSTRAP_SERVERS.split(",")]
    
    # Rate Limiting
    LOGIN_RATE_LIMIT: int = 5  # attempts per minute
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
