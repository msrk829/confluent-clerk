"""
LDAP Service
Handles LDAP authentication and user information retrieval
"""
from typing import Optional, Dict
import ldap3
from app.core.config import settings


class LDAPService:
    """Service for LDAP operations"""
    
    def __init__(self):
        """Initialize LDAP connection"""
        self.server = ldap3.Server(settings.LDAP_SERVER)
    
    def authenticate(self, username: str, password: str) -> Optional[Dict]:
        """
        Authenticate user against LDAP server
        
        Args:
            username: LDAP username
            password: User password
            
        Returns:
            Dictionary with user info if successful, None otherwise
            {
                'username': str,
                'email': str,
                'is_admin': bool
            }
        """
        try:
            # Build user DN
            user_dn = f"uid={username},{settings.LDAP_BASE_DN}"
            
            # Attempt to bind with user credentials
            conn = ldap3.Connection(
                self.server,
                user=user_dn,
                password=password,
                auto_bind=True
            )
            
            if conn.bound:
                # Search for user details
                conn.search(
                    search_base=settings.LDAP_BASE_DN,
                    search_filter=f'(uid={username})',
                    attributes=['mail', 'memberOf']
                )
                
                if conn.entries:
                    entry = conn.entries[0]
                    
                    # Extract email
                    email = str(entry.mail) if hasattr(entry, 'mail') else f"{username}@example.com"
                    
                    # Check admin group membership
                    is_admin = False
                    if hasattr(entry, 'memberOf'):
                        member_of = entry.memberOf
                        if isinstance(member_of, list):
                            is_admin = any(settings.LDAP_ADMIN_GROUP in group for group in member_of)
                        else:
                            is_admin = settings.LDAP_ADMIN_GROUP in str(member_of)
                    
                    conn.unbind()
                    
                    return {
                        'username': username,
                        'email': email,
                        'is_admin': is_admin
                    }
                
                conn.unbind()
            
            return None
            
        except ldap3.core.exceptions.LDAPException as e:
            print(f"LDAP authentication error: {str(e)}")
            return None
        except Exception as e:
            print(f"Unexpected error during LDAP authentication: {str(e)}")
            return None
    
    def check_admin_group(self, username: str) -> bool:
        """
        Check if user is member of admin group
        
        Args:
            username: LDAP username
            
        Returns:
            True if user is admin, False otherwise
        """
        try:
            # Bind with admin credentials to search
            conn = ldap3.Connection(
                self.server,
                user=settings.LDAP_BIND_DN,
                password=settings.LDAP_BIND_PASSWORD,
                auto_bind=True
            )
            
            # Search for user's group membership
            conn.search(
                search_base=settings.LDAP_BASE_DN,
                search_filter=f'(uid={username})',
                attributes=['memberOf']
            )
            
            if conn.entries:
                entry = conn.entries[0]
                if hasattr(entry, 'memberOf'):
                    member_of = entry.memberOf
                    if isinstance(member_of, list):
                        is_admin = any(settings.LDAP_ADMIN_GROUP in group for group in member_of)
                    else:
                        is_admin = settings.LDAP_ADMIN_GROUP in str(member_of)
                    
                    conn.unbind()
                    return is_admin
            
            conn.unbind()
            return False
            
        except Exception as e:
            print(f"Error checking admin group: {str(e)}")
            return False


# Mock LDAP Service for development/testing
class MockLDAPService(LDAPService):
    """
    Mock LDAP service for development without real LDAP server
    
    Usage: Replace LDAPService with MockLDAPService in auth.py for testing
    """
    
    def authenticate(self, username: str, password: str) -> Optional[Dict]:
        """Mock authentication - accepts any non-empty password"""
        if not password:
            return None
        
        # Mock admin user
        if username == "admin":
            return {
                'username': username,
                'email': f"{username}@example.com",
                'is_admin': True
            }
        
        # Mock regular user
        return {
            'username': username,
            'email': f"{username}@example.com",
            'is_admin': False
        }
    
    def check_admin_group(self, username: str) -> bool:
        """Mock admin check"""
        return username == "admin"
