// src/components/SideMenu.tsx
// KalingaCare — side menu. Opens by swiping from the left edge of the
// screen (IonMenu's default behavior) or by tapping the menu button in
// the header. Every item opens a real page.
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  IonMenu,
  IonHeader,
  IonToolbar,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
  IonMenuToggle,
} from "@ionic/react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  personOutline,
  gridOutline,
  receiptOutline,
  heartOutline,
  timeOutline,
  informationCircleOutline,
  peopleOutline,
  helpCircleOutline,
  logOutOutline,
} from "ionicons/icons";
import { auth, db } from "../firebase";
import { initials } from "../utils/avatar";
import logo from "../assets/kalingacare-logo.png";
import "./SideMenu.css";

interface MenuItem {
  label: string;
  icon: string;
  path: string;
}

const MENU_ITEMS: MenuItem[] = [
  { label: "Profile", icon: personOutline, path: "/profile" },
  { label: "Products", icon: gridOutline, path: "/products" },
  { label: "My Orders", icon: receiptOutline, path: "/orders" },
  { label: "Favorites", icon: heartOutline, path: "/favorites" },
  { label: "Company History", icon: timeOutline, path: "/company-history" },
  { label: "About KalingaCare", icon: informationCircleOutline, path: "/about" },
  { label: "Meet the Team", icon: peopleOutline, path: "/team" },
  { label: "Help & Support", icon: helpCircleOutline, path: "/help" },
];

const SideMenu: React.FC = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [userPhoto, setUserPhoto] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserName("");
        setUserPhoto(null);
        return;
      }
      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.exists() ? (snap.data() as any) : {};
      setUserName(user.displayName || data.fullName || "");
      setUserPhoto(data.photoBase64 || null);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <IonMenu contentId="main-content" type="overlay" className="side-menu">
      <IonHeader>
        <IonToolbar className="side-menu-toolbar">
          <div className="side-menu-brand">
            <img src={logo} alt="KalingaCare" className="side-menu-logo" />
            <span className="side-menu-appname">KalingaCare</span>
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent className="side-menu-content">
        {userName && (
          <div className="side-menu-user">
            {userPhoto ? (
              <img src={userPhoto} alt={userName} className="side-menu-avatar-img" />
            ) : (
              <span className="side-menu-avatar-initials">{initials(userName)}</span>
            )}
            <span className="side-menu-user-name">{userName}</span>
          </div>
        )}

        <IonList lines="none" className="side-menu-list">
          {MENU_ITEMS.map((item) => (
            <IonMenuToggle key={item.path} autoHide={false}>
              <IonItem button onClick={() => navigate(item.path)} className="side-menu-item">
                <IonIcon icon={item.icon} slot="start" />
                <IonLabel>{item.label}</IonLabel>
              </IonItem>
            </IonMenuToggle>
          ))}

          {userName && (
            <>
              <div className="side-menu-divider" />
              <IonMenuToggle autoHide={false}>
                <IonItem button onClick={handleLogout} className="side-menu-item side-menu-logout">
                  <IonIcon icon={logOutOutline} slot="start" />
                  <IonLabel>Log Out</IonLabel>
                </IonItem>
              </IonMenuToggle>
            </>
          )}
        </IonList>
      </IonContent>
    </IonMenu>
  );
};

export default SideMenu;
