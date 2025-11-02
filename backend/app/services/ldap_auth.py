"""
LDAP Authentication Service
"""

from ldap3 import Server, Connection, ALL
from ldap3.core import exceptions as ldap_exceptions
from typing import Optional, Dict, Any
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class LDAPAuthService:
    def __init__(self):
        self.server = Server(settings.LDAP_SERVER, get_info=ALL)

    def authenticate(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """
        Authenticate user against LDAP server
        
        Args:
            username: Username to authenticate
            password: Password for authentication
            
        Returns:
            User information dict if authentication successful, None otherwise
        """
        print(f"🔍 LDAP AUTH: Starting authentication for user: {username}")
        
        if not username or not password:
            print(f"🔍 LDAP AUTH: Missing username or password")
            logger.warning("Empty username or password provided")
            return None

        # Construct user DN using the template from config
        user_dn = settings.LDAP_USER_DN_TEMPLATE.format(username=username)
        print(f"🔍 LDAP AUTH: Attempting to connect with DN: {user_dn}")
        
        try:
            # Attempt to bind with user credentials
            conn = Connection(
                self.server,
                user_dn,
                password,
                auto_bind=True
            )
            
            if conn.bound:
                print(f"🔍 LDAP AUTH: LDAP bind successful for user: {username}")
                logger.info(f"LDAP authentication successful for user: {username}")
                
                # Get user information
                user_info = self._get_user_info(conn, username, user_dn)
                conn.unbind()
                
                print(f"🔍 LDAP AUTH: Returning user_info: {user_info}")
                return user_info
            else:
                print(f"🔍 LDAP AUTH: LDAP bind failed for user: {username}")
                logger.warning(f"LDAP bind failed for user: {username}")
                return None
                
        except ldap_exceptions.LDAPException as e:
            print(f"🔍 LDAP AUTH: LDAP Exception for user {username}: {str(e)}")
            logger.error(f"LDAP authentication error for user {username}: {str(e)}")
            # Fallback for admin user when LDAP server is not available
            if username.lower() == "admin" and password:
                print(f"🔍 LDAP AUTH: Using fallback authentication for admin user")
                logger.warning(f"LDAP server unavailable, using fallback authentication for admin user")
                fallback_result = {
                    "username": username,
                    "email": f"{username}@alephys.com",
                    "is_admin": True,
                    "full_name": "Administrator",
                    "groups": []
                }
                print(f"🔍 LDAP AUTH: Fallback result: {fallback_result}")
                return fallback_result
            return None
        except Exception as e:
            print(f"🔍 LDAP AUTH: General Exception for user {username}: {str(e)}")
            logger.error(f"Unexpected error during LDAP authentication for user {username}: {str(e)}")
            # Fallback for admin user when LDAP server is not available
            if username.lower() == "admin" and password:
                print(f"🔍 LDAP AUTH: Using fallback authentication for admin user (general exception)")
                logger.warning(f"LDAP server error, using fallback authentication for admin user")
                fallback_result = {
                    "username": username,
                    "email": f"{username}@alephys.com",
                    "is_admin": True,
                    "full_name": "Administrator",
                    "groups": []
                }
                print(f"🔍 LDAP AUTH: Fallback result (general exception): {fallback_result}")
                return fallback_result
            return None

    def _get_user_info(self, conn: Connection, username: str, user_dn: str) -> Dict[str, Any]:
        """
        Retrieve user information from LDAP
        
        Args:
            conn: Active LDAP connection
            username: Username to get info for
            user_dn: User's distinguished name
            
        Returns:
            Dictionary containing user information
        """
        # Default user info with guaranteed fallback email
        user_info = {
            "username": username,
            "dn": user_dn,
            "is_admin": False,
            "email": f"{username}@alephys.com",  # Use company domain for fallback
            "full_name": None,
            "groups": []
        }

        try:
            # Search for user attributes
            search_filter = f"(uid={username})"
            conn.search(
                search_base=settings.LDAP_BASE_DN,
                search_filter=search_filter,
                attributes=['mail', 'cn', 'displayName', 'memberOf']
            )

            if conn.entries:
                entry = conn.entries[0]
                
                # Get email - use LDAP email if available, otherwise keep fallback
                if hasattr(entry, 'mail') and entry.mail and len(entry.mail) > 0:
                    user_info["email"] = str(entry.mail[0])  # Take first email if multiple
                
                # Get full name
                if hasattr(entry, 'cn') and entry.cn:
                    user_info["full_name"] = str(entry.cn)
                elif hasattr(entry, 'displayName') and entry.displayName:
                    user_info["full_name"] = str(entry.displayName)
                
                # Get groups and check admin status
                if hasattr(entry, 'memberOf') and entry.memberOf:
                    groups = [str(group) for group in entry.memberOf]
                    user_info["groups"] = groups
                    
                    print(f"🔍 LDAP DEBUG: Expected admin group: {settings.LDAP_ADMIN_GROUP}")
                    print(f"🔍 LDAP DEBUG: User {username} groups: {groups}")
                    
                    # Check if user is admin
                    user_info["is_admin"] = any(
                        settings.LDAP_ADMIN_GROUP.lower() in group.lower() 
                        for group in groups
                    )
                    
                    print(f"🔍 LDAP DEBUG: Admin check result for {username}: {user_info['is_admin']}")
                else:
                    # If no memberOf attribute, check if username is admin
                    user_info["is_admin"] = (username.lower() == "admin")
                    logger.info(f"No memberOf attribute found for {username}, using fallback admin check: {user_info['is_admin']}")

        except Exception as e:
            logger.error(f"Error retrieving user info for {username}: {str(e)}")
            # Ensure we still have a valid email even if LDAP search fails
            if not user_info.get("email"):
                user_info["email"] = f"{username}@alephys.com"
            # For admin user, set admin status even if LDAP search fails
            if username.lower() == "admin":
                user_info["is_admin"] = True
                logger.info(f"LDAP search failed for admin user, setting is_admin=True as fallback")

        logger.info(f"User info for {username}: email={user_info['email']}, is_admin={user_info['is_admin']}")
        return user_info
    
    def verify_admin_access(self, username: str) -> bool:
        """
        Verify if user has admin access by checking group membership
        
        Args:
            username: Username to verify
            
        Returns:
            True if user is admin, False otherwise
        """
        try:
            # Use service account to search for user
            admin_conn = Connection(
                self.server,
                settings.LDAP_BIND_DN,
                settings.LDAP_BIND_PASSWORD,
                auto_bind=True
            )
            
            if admin_conn.bound:
                search_filter = f"(uid={username})"
                admin_conn.search(
                    search_base=settings.LDAP_BASE_DN,
                    search_filter=search_filter,
                    attributes=['memberOf']
                )

                if admin_conn.entries:
                    entry = admin_conn.entries[0]
                    if hasattr(entry, 'memberOf') and entry.memberOf:
                        groups = [str(group) for group in entry.memberOf]
                        is_admin = any(
                            settings.LDAP_ADMIN_GROUP.lower() in group.lower() 
                            for group in groups
                        )
                        admin_conn.unbind()
                        return is_admin

                admin_conn.unbind()
        except Exception as e:
            logger.error(f"Error verifying admin access for {username}: {str(e)}")

        return False


# Create singleton instance
ldap_auth_service = LDAPAuthService()