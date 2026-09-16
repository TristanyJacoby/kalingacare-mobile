import React, { useState } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, IonTabs, IonTabBar, IonTabButton, IonIcon, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { home, gridOutline, cart, person } from 'ionicons/icons';
import { CartProvider } from './context/CartContext';
import SideMenu from './components/SideMenu';
import SplashScreen from './components/SplashScreen';

import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import MyAccount from './pages/MyAccount';
import MyOrders from './pages/MyOrders';
import SavedAddresses from './pages/SavedAddresses';
import HelpSupport from './pages/HelpSupport';
import Login from './pages/Login';
import Register from './pages/Register';
import ComingSoon from './pages/ComingSoon';
import AboutKalingaCare from './pages/AboutKalingaCare';
//TBC
import Favorites from './pages/Favorites';
import WriteReview from './pages/WriteReview';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 *
 * Turned off: every screen in this app is custom-styled with fixed
 * light colors (blue/white theme), none of it was built to also look
 * right in dark mode. With this on, any gap not covered by a custom
 * style fell through to Ionic's dark system background instead of
 * this app's own light one — that's what caused the black patches
 * around the floating tab bar and (previously) inside the side menu.
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
/* import '@ionic/react/css/palettes/dark.system.css'; */

/* Theme variables */
import './theme/variables.css';

/* Floating tab bar (Sept 2026 redesign) */
import './theme/tabbar.css';

setupIonicReact();

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return (
      <IonApp>
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </IonApp>
    );
  }

  return (
    <IonApp>
      <CartProvider>
      <IonReactRouter>
        <SideMenu />
        <IonTabs>
          <IonRouterOutlet id="main-content">
            <Route path="/home" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-confirmation" element={<OrderConfirmation />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/account" element={<MyAccount />} />
            <Route path="/orders" element={<MyOrders />} />
            <Route path="/addresses" element={<SavedAddresses />} />
            <Route path="/help" element={<HelpSupport />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/review/:orderId/:productId" element={<WriteReview />} />
            <Route path="/about" element={<AboutKalingaCare />} />
            <Route path="/more/:section" element={<ComingSoon />} />
          </IonRouterOutlet>

          {/* Icon-only floating pill nav — labels removed for the new design;
              each button keeps an aria-label for accessibility. */}
          <IonTabBar slot="bottom" className="floating-tab-bar">
            <IonTabButton tab="home" href="/home" aria-label="Home">
              <IonIcon icon={home} />
            </IonTabButton>
            <IonTabButton tab="categories" href="/products" aria-label="Categories">
              <IonIcon icon={gridOutline} />
            </IonTabButton>
            <IonTabButton tab="cart" href="/cart" aria-label="Cart">
              <IonIcon icon={cart} />
            </IonTabButton>
            <IonTabButton tab="profile" href="/profile" aria-label="Profile">
              <IonIcon icon={person} />
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
      </CartProvider>
    </IonApp>
  );
};

export default App;
