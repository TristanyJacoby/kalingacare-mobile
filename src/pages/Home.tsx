import React, { useEffect, useState } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonThumbnail,
  IonImg,
  IonLabel,
  IonSpinner,
  IonSearchbar,
} from "@ionic/react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import "./Home.css";

interface Product {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  price: number;
  stock?: number;
  img?: string;
  imgBase64?: string;
}

function peso(amount: number) {
  return "₱" + amount.toLocaleString("en-PH");
}

const Home: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    // Live subscription — same idea as the web app's products.js onSnapshot.
    // Updates automatically if admin adds/edits/deletes a product.
    const q = query(collection(db, "products"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Product[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Product, "id">),
      }));
      setProducts(list);
      setLoading(false);
    });

    // Stop listening when this screen unmounts, so it doesn't keep running
    // in the background after you navigate away.
    return () => unsubscribe();
  }, []);

  const visibleProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>KalingaCare</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={searchText}
            onIonInput={(e) => setSearchText(e.detail.value ?? "")}
            placeholder="Search products..."
          />
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        {loading && (
          <div style={{ textAlign: "center", marginTop: "40px" }}>
            <IonSpinner name="crescent" />
          </div>
        )}

        {!loading && visibleProducts.length === 0 && (
          <div
            style={{ textAlign: "center", marginTop: "40px", color: "#888" }}
          >
            No products found.
          </div>
        )}

        <IonList>
          {visibleProducts.map((product) => (
            <IonItem key={product.id} button detail>
              <IonThumbnail slot="start">
                <img
                  src={product.imgBase64 || product.img || ""}
                  alt={product.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "8px",
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "data:image/svg+xml;utf8," +
                      encodeURIComponent(
                        `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><rect width="60" height="60" fill="#333"/><text x="30" y="34" font-size="10" fill="#888" text-anchor="middle" font-family="sans-serif">No image</text></svg>`,
                      );
                  }}
                />
              </IonThumbnail>
              <IonLabel>
                <h2>{product.name}</h2>
                <p>{product.subcategory || product.category}</p>
                <p>{peso(product.price)}</p>
              </IonLabel>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default Home;
