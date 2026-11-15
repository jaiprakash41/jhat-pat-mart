"use client";

import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bike,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  CreditCard,
  Heart,
  LayoutDashboard,
  Leaf,
  MapPin,
  Menu,
  Minus,
  Package,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge, Button, Input, Select, useToast } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  categories,
  formatPrice,
  imageUrl,
  products,
  type Product,
} from "@/lib/catalog";

type Cart = Record<string, number>;
type Order = {
  id: string;
  items: Cart;
  total: number;
  date: string;
  slot: string;
  status: string;
  payment: string;
  name: string;
  phone: string;
  address: string;
  pincode: string;
};
type Account = { name: string; phone: string } | null;
type View = "shop" | "admin" | "rider";

const createLocalOrderId = () => `JM${Date.now().toString().slice(-7)}`;
const currentTimestamp = () => new Date().toISOString();
const demoOrderDate = "2026-11-16T08:30:00.000Z";
const CART_KEY = "jhatpat-cart-v1";
const ORDERS_KEY = "jhatpat-orders-v1";
const ACCOUNT_KEY = "jhatpat-account-v1";
const serviceablePincodes = new Set([
  "201301",
  "201302",
  "201303",
  "201304",
  "201305",
  "201306",
  "201307",
  "201309",
]);
const looseMatch = (term: string, value: string) => {
  const query = term.trim().toLocaleLowerCase();
  const candidate = value.toLocaleLowerCase();
  if (!query || candidate.includes(query)) return true;
  if (
    query.length < 4 ||
    candidate.length < 4 ||
    Math.abs(query.length - candidate.length) > 1
  ) {
    return false;
  }
  let previous = Array.from(
    { length: candidate.length + 1 },
    (_, index) => index,
  );
  for (let row = 1; row <= query.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= candidate.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] +
          (query[row - 1] === candidate[column - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[candidate.length] <= 1;
};
const deliverySlots = [
  "10:00 AM – 12:00 PM",
  "12:00 PM – 02:00 PM",
  "02:00 PM – 04:00 PM",
  "04:00 PM – 06:00 PM",
  "06:00 PM – 08:00 PM",
];
const demoRiderOrder: Order = {
  id: "JM804231",
  items: { banana: 1, milk: 1, tomato: 1 },
  total: 120,
  date: demoOrderDate,
  slot: deliverySlots[2],
  status: "Out for delivery",
  payment: "UPI",
  name: "Aarav Mehta",
  phone: "9876543210",
  address: "Silver Oak Apartments, Sector 50",
  pincode: "201301",
};
const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name."),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number."),
  address: z.string().trim().min(8, "Add your flat, building and street."),
  pincode: z
    .string()
    .regex(/^\d{6}$/, "Enter a 6-digit pincode.")
    .refine((value) => serviceablePincodes.has(value), {
      message: "We don't deliver to this pincode just yet.",
    }),
});
type CheckoutFields = z.infer<typeof checkoutSchema>;

const currency = (amount: number) => formatPrice(amount);

function ProductCard({
  product,
  quantity,
  onAdd,
  onChange,
  onOpen,
}: {
  product: Product;
  quantity: number;
  onAdd: () => void;
  onChange: (delta: number) => void;
  onOpen: () => void;
}) {
  const discount = Math.round(
    ((product.mrp - product.price) / product.mrp) * 100,
  );
  return (
    <article className="product-card">
      <button
        className={`product-image ${product.color}`}
        onClick={onOpen}
        aria-label={`View ${product.name}`}
      >
        {product.badge && (
          <span className="product-badge">{product.badge}</span>
        )}
        <Image
          src={imageUrl(product.image)}
          alt=""
          width={720}
          height={720}
          sizes="(max-width: 520px) 50vw, (max-width: 800px) 33vw, 25vw"
        />
        <span className="discount-tag">{discount}% off</span>
      </button>
      <div className="product-info">
        <div className="product-meta">
          <span>{product.brand}</span>
          <span className="rating">
            <Star size={12} fill="currentColor" /> {product.rating}
          </span>
        </div>
        <button className="product-title" onClick={onOpen}>
          {product.name}
        </button>
        <p className="product-hindi">
          {product.hindiName} · {product.pack}
        </p>
        <div className="product-bottom">
          <div>
            <strong>{currency(product.price)}</strong>
            <del>{currency(product.mrp)}</del>
          </div>
          {quantity > 0 ? (
            <div
              className="quantity-control"
              aria-label={`${quantity} in cart`}
            >
              <button
                onClick={() => onChange(-1)}
                aria-label={`Remove one ${product.name}`}
              >
                <Minus size={14} />
              </button>
              <span>{quantity}</span>
              <button
                onClick={() => onChange(1)}
                aria-label={`Add one ${product.name}`}
              >
                <Plus size={14} />
              </button>
            </div>
          ) : (
            <button
              className="add-button"
              onClick={onAdd}
              aria-label={`Add ${product.name} to cart`}
            >
              <Plus size={16} /> Add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function Modal({
  title,
  eyebrow,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`modal ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {children}
      </section>
    </div>
  );
}

export default function Home() {
  const toast = useToast();
  const [cart, setCart] = useState<Cart>({});
  const [storageReady, setStorageReady] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [account, setAccount] = useState<Account>(null);
  const [view, setView] = useState<View>("shop");
  const [activeCategory, setActiveCategory] = useState("All groceries");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("popular");
  const [onlyDeals, setOnlyDeals] = useState(false);
  const [pincode, setPincode] = useState("201301");
  const [checkingPincode, setCheckingPincode] = useState(false);
  const [pincodeMessage, setPincodeMessage] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [loginPhone, setLoginPhone] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [loginStep, setLoginStep] = useState<"phone" | "otp">("phone");
  const [selectedSlot, setSelectedSlot] = useState(deliverySlots[1]);
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [contactless, setContactless] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [adminTab, setAdminTab] = useState("Overview");
  const [stockLevels, setStockLevels] = useState<Record<string, number>>({});
  const [riderStatus, setRiderStatus] = useState<string | null>(null);
  const [deliveryOtp, setDeliveryOtp] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { data: catalog = products } = useQuery({
    queryKey: ["catalogue", "noida"],
    queryFn: async () => products,
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<CheckoutFields>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { name: "", phone: "", address: "", pincode: "201301" },
  });

  useEffect(() => {
    let restoredCart: Cart | null = null;
    let restoredOrders: Order[] | null = null;
    let restoredAccount: Account = null;
    let restoreError: unknown = null;
    try {
      const savedCart = localStorage.getItem(CART_KEY);
      const savedOrders = localStorage.getItem(ORDERS_KEY);
      const savedAccount = localStorage.getItem(ACCOUNT_KEY);
      if (savedCart) restoredCart = JSON.parse(savedCart) as Cart;
      if (savedOrders) restoredOrders = JSON.parse(savedOrders) as Order[];
      if (savedAccount) restoredAccount = JSON.parse(savedAccount) as Account;
    } catch (error) {
      restoreError = error;
      console.error("Could not restore saved JhatpatMart data.", error);
    }
    const timer = window.setTimeout(() => {
      if (restoredCart) setCart(restoredCart);
      if (restoredOrders) setOrders(restoredOrders);
      if (restoredAccount) setAccount(restoredAccount);
      setStorageReady(true);
      if (restoreError) {
        toast({
          title: "We couldn't restore your saved basket.",
          description:
            "You can keep shopping; this basket will be saved from now on.",
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, storageReady]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const cartCount = Object.values(cart).reduce(
    (sum, quantity) => sum + quantity,
    0,
  );
  const subtotal = catalog.reduce(
    (sum, product) => sum + product.price * (cart[product.id] ?? 0),
    0,
  );
  const discount = couponApplied ? Math.min(Math.round(subtotal * 0.1), 60) : 0;
  const deliveryFee = subtotal === 0 || subtotal - discount >= 399 ? 0 : 25;
  const total = subtotal - discount + deliveryFee;
  const filteredProducts = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase();
    const result = catalog.filter((product) => {
      const matchesCategory =
        activeCategory === "All groceries" ||
        product.category === activeCategory;
      const matchesSearch =
        !normalized ||
        [
          product.name,
          product.hindiName,
          product.brand,
          ...product.aliases,
        ].some((value) => looseMatch(normalized, value));
      const matchesDeal = !onlyDeals || product.mrp > product.price;
      return matchesCategory && matchesSearch && matchesDeal;
    });
    if (sortBy === "price-low") result.sort((a, b) => a.price - b.price);
    if (sortBy === "price-high") result.sort((a, b) => b.price - a.price);
    if (sortBy === "popular") result.sort((a, b) => b.rating - a.rating);
    if (sortBy === "newest")
      result.sort((a, b) => catalog.indexOf(b) - catalog.indexOf(a));
    return result;
  }, [activeCategory, catalog, onlyDeals, search, sortBy]);

  const persistOrders = (nextOrders: Order[]) => {
    setOrders(nextOrders);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(nextOrders));
  };

  const changeQuantity = (productId: string, delta: number) => {
    const product = catalog.find((item) => item.id === productId);
    if (delta > 0 && product && (cart[productId] ?? 0) >= product.stock) {
      toast({
        title: "That’s all the stock we have",
        status: "info",
        duration: 2500,
      });
      return;
    }
    setCart((current) => {
      const next = { ...current };
      const quantity = (next[productId] ?? 0) + delta;
      if (quantity <= 0) delete next[productId];
      else if (!product || quantity <= product.stock)
        next[productId] = quantity;
      return next;
    });
  };

  const openRiderView = () => {
    setRiderStatus(null);
    setDeliveryOtp("");
    setView("rider");
  };

  const addProduct = (product: Product) => {
    if ((cart[product.id] ?? 0) >= product.stock) {
      toast({
        title: "That’s all the stock we have",
        status: "info",
        duration: 2500,
      });
      return;
    }
    changeQuantity(product.id, 1);
    toast({
      title: `${product.name} added`,
      description: "Fresh picks, straight to your basket.",
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  };

  const validateSlotCapacity = (slot: string) =>
    orders.filter(
      (order) => order.slot === slot && order.status !== "Cancelled",
    ).length < 8;

  const placeOrder = async (values: CheckoutFields) => {
    if (subtotal < 149) {
      toast({
        title: "Add a little more to your basket",
        description: "The minimum order value is ₹149.",
        status: "warning",
        duration: 3500,
      });
      return;
    }
    if (!validateSlotCapacity(selectedSlot)) {
      toast({
        title: "This slot just filled up",
        description: "Choose another delivery time to continue.",
        status: "error",
        duration: 3500,
      });
      return;
    }
    if (paymentMethod === "Cash on delivery" && total > 2000) {
      toast({
        title: "Cash on delivery is available up to ₹2,000.",
        description: "Choose UPI, card or net banking for this order.",
        status: "warning",
        duration: 3500,
      });
      return;
    }
    if (paymentMethod === "Cash on delivery" && loginOtp !== "1234") {
      toast({
        title: "Verify your phone first",
        description:
          "Enter the demo OTP 1234 to place a cash-on-delivery order.",
        status: "warning",
        duration: 4000,
      });
      return;
    }
    const order: Order = {
      id: createLocalOrderId(),
      items: { ...cart },
      total,
      date: currentTimestamp(),
      slot: selectedSlot,
      status: "Placed",
      payment: paymentMethod,
      name: values.name,
      phone: values.phone,
      address: values.address,
      pincode: values.pincode,
    };
    const nextOrders = [order, ...orders];
    persistOrders(nextOrders);
    setCart({});
    setCouponApplied(false);
    setCouponInput("");
    setCheckoutOpen(false);
    setCartOpen(false);
    setActiveOrder(order);
    setLoginOtp("");
    setDeliveryNote("");
    setContactless(false);
  };

  const checkPincode = () => {
    setCheckingPincode(true);
    window.setTimeout(() => {
      const isAvailable = serviceablePincodes.has(pincode.trim());
      setPincodeMessage(
        isAvailable
          ? "Good news! We deliver to your doorstep."
          : "We’re not there yet. Try a nearby Noida pincode.",
      );
      setCheckingPincode(false);
    }, 350);
  };

  const selectCategory = (category: string) => {
    setActiveCategory(category);
    setSearch("");
    setView("shop");
    setNavOpen(false);
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
  };

  const openCheckout = () => {
    if (subtotal < 149) {
      toast({
        title: "Your basket needs a little more",
        description: "Add groceries worth ₹149 to unlock checkout.",
        status: "info",
        duration: 3000,
      });
      return;
    }
    setValue("name", account?.name ?? "");
    setValue("phone", account?.phone ?? "");
    setValue("pincode", pincode);
    setCartOpen(false);
    setCheckoutOpen(true);
  };

  const applyCoupon = () => {
    if (couponInput.trim().toUpperCase() !== "FRESH10") {
      setCouponApplied(false);
      toast({
        title: "That code didn’t work",
        description: "Try FRESH10 for 10% off orders above ₹299.",
        status: "error",
        duration: 3000,
      });
      return;
    }
    if (subtotal < 299) {
      toast({
        title: "Add ₹299 to use this offer",
        description: "The FRESH10 discount is for baskets of ₹299 or more.",
        status: "info",
        duration: 3000,
      });
      return;
    }
    setCouponApplied(true);
    toast({
      title: "FRESH10 applied — nice!",
      status: "success",
      duration: 2200,
    });
  };

  const startLogin = () => {
    if (!/^[6-9]\d{9}$/.test(loginPhone)) {
      toast({
        title: "Enter a valid 10-digit mobile number.",
        status: "warning",
        duration: 2800,
      });
      return;
    }
    setLoginStep("otp");
  };

  const finishLogin = () => {
    if (loginOtp !== "1234") {
      toast({
        title: "Incorrect OTP. Try the demo code 1234.",
        status: "error",
        duration: 3000,
      });
      return;
    }
    const signedIn = { name: "Jhatpat shopper", phone: loginPhone };
    setAccount(signedIn);
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(signedIn));
    setAccountOpen(false);
    setLoginStep("phone");
    setLoginOtp("");
    toast({ title: "You’re signed in!", status: "success", duration: 2200 });
  };

  const updateOrderStatus = (orderId: string, status: string) => {
    const next = orders.map((order) =>
      order.id === orderId ? { ...order, status } : order,
    );
    persistOrders(next);
    if (activeOrder?.id === orderId) setActiveOrder({ ...activeOrder, status });
  };

  const beginReorder = (order: Order) => {
    const availableItems = Object.entries(order.items).reduce<Cart>(
      (items, [id, quantity]) => {
        const product = catalog.find((item) => item.id === id);
        if (product && product.stock > 0)
          items[id] = Math.min(quantity, product.stock);
        return items;
      },
      {},
    );
    setCart((current) => {
      const next = { ...current };
      for (const [id, quantity] of Object.entries(availableItems)) {
        const product = catalog.find((item) => item.id === id);
        next[id] = Math.min(
          (next[id] ?? 0) + quantity,
          product?.stock ?? quantity,
        );
      }
      return next;
    });
    setView("shop");
    setActiveOrder(null);
    setCartOpen(true);
    toast({
      title: "Available items are back in your basket.",
      status: "success",
      duration: 2500,
    });
  };

  const openCheckoutForm = (
    <form
      className="checkout-form"
      onSubmit={handleSubmit(placeOrder)}
      noValidate
    >
      <div className="checkout-fields">
        <label className="field">
          <span>Full name</span>
          <Input
            {...register("name")}
            placeholder="Your name"
            autoComplete="name"
          />
          {errors.name && (
            <small className="field-error">{errors.name.message}</small>
          )}
        </label>
        <label className="field">
          <span>Mobile number</span>
          <div className="phone-input">
            <span>+91</span>
            <Input
              {...register("phone")}
              placeholder="10-digit number"
              inputMode="numeric"
              autoComplete="tel-national"
            />
          </div>
          {errors.phone && (
            <small className="field-error">{errors.phone.message}</small>
          )}
        </label>
        <label className="field field-full">
          <span>Delivery address</span>
          <Input
            {...register("address")}
            placeholder="Flat, building, street and landmark"
            autoComplete="street-address"
          />
          {errors.address && (
            <small className="field-error">{errors.address.message}</small>
          )}
        </label>
        <label className="field">
          <span>Pincode</span>
          <Input
            {...register("pincode")}
            placeholder="201301"
            inputMode="numeric"
          />
          {errors.pincode && (
            <small className="field-error">{errors.pincode.message}</small>
          )}
        </label>
        <label className="field">
          <span>
            Delivery instructions <em>optional</em>
          </span>
          <Input
            value={deliveryNote}
            onChange={(event) => setDeliveryNote(event.target.value)}
            placeholder="Gate code, nearby landmark…"
          />
        </label>
      </div>
      <div className="slot-heading">
        <Clock3 size={17} /> <strong>Choose a delivery slot</strong>
      </div>
      <div className="slot-list">
        {deliverySlots.map((slot, index) => {
          const available = validateSlotCapacity(slot);
          return (
            <button
              type="button"
              key={slot}
              className={`slot-option ${selectedSlot === slot ? "selected" : ""} ${!available ? "unavailable" : ""}`}
              disabled={!available}
              onClick={() => setSelectedSlot(slot)}
            >
              <span>{index === 0 ? "Today" : "Today"}</span>
              <strong>{slot}</strong>
              {!available && <small>Full</small>}
            </button>
          );
        })}
      </div>
      <div className="slot-heading payment-heading">
        <CreditCard size={17} /> <strong>Pay your way</strong>
      </div>
      <div className="payment-options">
        {[
          { label: "UPI", detail: "GPay, PhonePe, Paytm", icon: "◉" },
          { label: "Cards", detail: "Credit or debit card", icon: "▣" },
          { label: "Net banking", detail: "All major banks", icon: "⌂" },
          {
            label: "Cash on delivery",
            detail: "Up to ₹2,000 · OTP required",
            icon: "₹",
          },
        ].map((payment) => (
          <button
            key={payment.label}
            className={`payment-option ${paymentMethod === payment.label ? "selected" : ""}`}
            onClick={() => setPaymentMethod(payment.label)}
            type="button"
          >
            <span className="payment-icon">{payment.icon}</span>
            <span>
              <strong>{payment.label}</strong>
              <small>{payment.detail}</small>
            </span>
            <span className="radio-dot" />
          </button>
        ))}
      </div>
      {paymentMethod === "Cash on delivery" && (
        <label className="field otp-field">
          <span>
            Verify this phone <em>demo code: 1234</em>
          </span>
          <Input
            value={loginOtp}
            onChange={(event) => setLoginOtp(event.target.value)}
            placeholder="4-digit OTP"
            inputMode="numeric"
            maxLength={4}
          />
        </label>
      )}
      <label className="check-option">
        <input
          type="checkbox"
          checked={contactless}
          onChange={(event) => setContactless(event.target.checked)}
        />
        <span>Leave it at my door (contactless delivery)</span>
      </label>
      <div className="checkout-total">
        <div>
          <span>To pay</span>
          <strong>{currency(total)}</strong>
        </div>
        <small>Price includes applicable GST · Free delivery over ₹399</small>
      </div>
      <Button
        className="checkout-submit"
        type="submit"
        isLoading={isSubmitting}
        loadingText="Placing order…"
      >
        Place order <ArrowRight size={17} />
      </Button>
      <p className="demo-caption">
        <ShieldCheck size={14} /> Demo checkout — no payment will be collected.
      </p>
    </form>
  );

  const itemCountText = `${cartCount} ${cartCount === 1 ? "item" : "items"}`;
  const activeOrders = orders.filter(
    (order) => order.status !== "Delivered" && order.status !== "Cancelled",
  );
  const riderOrder =
    activeOrders[0] ??
    (view === "rider" && orders[0]?.status === "Delivered"
      ? orders[0]
      : null) ??
    demoRiderOrder;
  const activeRiderStatus =
    riderStatus ??
    (riderOrder.status === "Delivered" ? "Delivered" : "Out for delivery");
  const riderItems = Object.entries(riderOrder.items)
    .map(([id, quantity]) => ({
      product: catalog.find((item) => item.id === id),
      quantity,
    }))
    .filter((item) => item.product);

  return (
    <main>
      <div className="announcement">
        <Sparkles size={14} /> Your first order? Get 10% off with{" "}
        <strong>FRESH10</strong>
        <button
          onClick={() => {
            setCouponInput("FRESH10");
            document
              .getElementById("shop")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          Shop now <ArrowRight size={13} />
        </button>
      </div>
      <header className="site-header">
        <div className="header-main">
          <button
            className="mobile-menu"
            onClick={() => setNavOpen((open) => !open)}
            aria-label="Toggle menu"
          >
            <Menu size={21} />
          </button>
          <button
            className="brand"
            onClick={() => {
              setView("shop");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            aria-label="JhatpatMart home"
          >
            <span className="brand-mark">
              <Leaf size={21} fill="currentColor" />
            </span>
            <span className="brand-name">
              jhatpat<span>mart</span>
              <small>GOOD FOOD. RIGHT ON TIME.</small>
            </span>
          </button>
          <div className="location-wrap">
            <div className="location-pin">
              <MapPin size={17} />
            </div>
            <div className="location-copy">
              <span>DELIVERING TO</span>
              <div>
                <input
                  aria-label="Delivery pincode"
                  value={pincode}
                  maxLength={6}
                  onChange={(event) => {
                    setPincode(event.target.value.replace(/\D/g, ""));
                    setPincodeMessage("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") checkPincode();
                  }}
                />
                <button
                  onClick={checkPincode}
                  disabled={checkingPincode}
                  aria-label="Check pincode"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
              {pincodeMessage && (
                <small
                  className={
                    serviceablePincodes.has(pincode)
                      ? "location-good"
                      : "location-bad"
                  }
                >
                  {pincodeMessage}
                </small>
              )}
            </div>
          </div>
          <label className="search-box">
            <Search size={18} />
            <input
              ref={searchInputRef}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setView("shop");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter")
                  document
                    .getElementById("shop")
                    ?.scrollIntoView({ behavior: "smooth" });
              }}
              placeholder="Search for atta, aloo, apples…"
              aria-label="Search groceries"
            />
            {search && (
              <button onClick={() => setSearch("")} aria-label="Clear search">
                <X size={16} />
              </button>
            )}
            <span className="search-shortcut">⌘ K</span>
          </label>
          <div className="header-actions">
            <button
              className="account-button"
              onClick={() => {
                setLoginStep("phone");
                setAccountOpen(true);
              }}
            >
              <UserRound size={19} />
              <span>
                {account ? `Hi, ${account.name.split(" ")[0]}` : "Sign in"}
              </span>
            </button>
            <button
              className="cart-button"
              onClick={() => setCartOpen(true)}
              aria-label={`Open basket with ${cartCount} items`}
            >
              <ShoppingBag size={20} />
              <span>Basket</span>
              <b>{cartCount}</b>
            </button>
          </div>
        </div>
        <nav
          className={`category-nav ${navOpen ? "nav-open" : ""}`}
          aria-label="Main navigation"
        >
          <button
            className={
              view === "shop" && activeCategory === "All groceries"
                ? "nav-active"
                : ""
            }
            onClick={() => selectCategory("All groceries")}
          >
            All groceries
          </button>
          {categories.slice(1).map((category) => (
            <button
              key={category.name}
              className={
                view === "shop" && activeCategory === category.name
                  ? "nav-active"
                  : ""
              }
              onClick={() => selectCategory(category.name)}
            >
              {category.name}
            </button>
          ))}
          <span className="nav-spacer" />
          <button
            onClick={() => {
              setView("shop");
              document
                .getElementById("deals")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            className="nav-offer"
          >
            <Sparkles size={14} /> Today’s deals
          </button>
          <button onClick={() => setView("admin")} className="nav-tools">
            <LayoutDashboard size={14} /> Admin demo
          </button>
        </nav>
      </header>

      {view === "shop" && (
        <>
          {activeOrders.length > 0 && (
            <button
              className="order-ribbon"
              onClick={() => setActiveOrder(activeOrders[0])}
            >
              <span className="live-dot" /> Your order {activeOrders[0].id} is{" "}
              {activeOrders[0].status.toLowerCase()}{" "}
              <span>
                Track order <ArrowRight size={14} />
              </span>
            </button>
          )}
          <section className="hero-section">
            <div className="hero-copy">
              <span className="eyebrow">
                <span className="eyebrow-dot" /> FARM FRESH. NOIDA FAST.
              </span>
              <h1>
                Good food.
                <br />
                <span>Good mood.</span>
                <br />
                No long waits.
              </h1>
              <p>
                Everyday groceries and farm-fresh finds, handpicked and at your
                doorstep in just 30 minutes.
              </p>
              <div className="hero-buttons">
                <button
                  className="primary-button"
                  onClick={() =>
                    document
                      .getElementById("shop")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Shop fresh picks <ArrowRight size={17} />
                </button>
                <span className="hero-note">
                  <Truck size={16} /> Free delivery over ₹399
                </span>
              </div>
              <div className="hero-proof">
                <div className="avatar-stack">
                  <span>👩🏽</span>
                  <span>👨🏻</span>
                  <span>👩🏼</span>
                </div>
                <div>
                  <strong>4.9/5 from Noida homes</strong>
                  <small>Freshness you can count on</small>
                </div>
                <span className="proof-star">
                  <Star size={17} fill="currentColor" />
                </span>
              </div>
            </div>
            <div
              className="hero-art"
              aria-label="Fresh groceries arranged on a kitchen counter"
            >
              <div className="hero-image-main">
                <Image
                  src={imageUrl("photo-1542838132-92c53300491e")}
                  alt="A colorful basket of fresh market produce"
                  fill
                  priority
                  sizes="(max-width: 800px) 75vw, 390px"
                />
              </div>
              <div className="hero-orbit orbit-one" />
              <div className="hero-orbit orbit-two" />
              <div className="float-note delivery-note">
                <span className="delivery-icon">
                  <Bike size={18} />
                </span>
                <span>
                  <strong>At your door</strong>
                  <small>in about 30 min</small>
                </span>
                <BadgeCheck size={16} className="verified-icon" />
              </div>
              <div className="float-note fresh-note">
                <span className="fresh-icon">
                  <Leaf size={18} />
                </span>
                <span>
                  <strong>Picked today</strong>
                  <small>From local farms</small>
                </span>
              </div>
              <div className="hero-sticker">
                <span>
                  FRESH
                  <br />
                  AS IT
                  <br />
                  GETS
                </span>
                <Leaf size={20} />
              </div>
            </div>
          </section>
          <section className="service-strip" aria-label="Our promises">
            <div>
              <span className="service-icon green">
                <Truck size={18} />
              </span>
              <span>
                <strong>30-minute delivery</strong>
                <small>Quick, reliable & careful</small>
              </span>
            </div>
            <div>
              <span className="service-icon yellow">
                <Leaf size={18} />
              </span>
              <span>
                <strong>Farm-fresh promise</strong>
                <small>Picked fresh, every morning</small>
              </span>
            </div>
            <div>
              <span className="service-icon lilac">
                <ShieldCheck size={18} />
              </span>
              <span>
                <strong>Prices you can trust</strong>
                <small>No surprises at checkout</small>
              </span>
            </div>
            <div>
              <span className="service-icon peach">
                <Heart size={18} />
              </span>
              <span>
                <strong>Made for your home</strong>
                <small>Curated with a little love</small>
              </span>
            </div>
          </section>
          <section className="category-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">YOUR KITCHEN, SORTED</span>
                <h2>Shop by category</h2>
              </div>
              <button
                className="text-button"
                onClick={() => selectCategory("All groceries")}
              >
                View everything <ArrowRight size={15} />
              </button>
            </div>
            <div className="category-grid">
              {categories.slice(1).map((category, index) => (
                <button
                  key={category.name}
                  className={`category-tile ${category.color}`}
                  onClick={() => selectCategory(category.name)}
                >
                  <span className="category-art">{category.icon}</span>
                  <span className="category-label">
                    <strong>{category.name}</strong>
                    <small>
                      {[24, 18, 32, 16, 21][index]}+ essentials{" "}
                      <ArrowRight size={13} />
                    </small>
                  </span>
                  <span className="category-index">0{index + 1}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="deal-banner" id="deals">
            <div className="deal-decoration">✳</div>
            <div className="deal-copy">
              <span>THE LITTLE EXTRA</span>
              <h2>
                A fresher basket,
                <br />a happier wallet.
              </h2>
              <p>Enjoy 10% off your first order of ₹299 or more.</p>
              <button
                onClick={() => {
                  setCouponInput("FRESH10");
                  document
                    .getElementById("shop")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Use code <strong>FRESH10</strong> <ArrowRight size={15} />
              </button>
            </div>
            <div className="deal-product">
              <div className="deal-orb">
                <Image
                  src={imageUrl("photo-1490645935967-10de6ba17061")}
                  alt="Fresh seasonal fruits and vegetables"
                  fill
                  sizes="210px"
                />
              </div>
              <div className="deal-tag">
                <Sparkles size={14} /> A LITTLE GIFT FOR YOU
              </div>
            </div>
            <div className="deal-side-note">
              GOOD
              <br />
              THINGS
              <br />
              <span>GROW</span>
              <Leaf size={23} />
            </div>
          </section>
          <section className="shop-section" id="shop">
            <div className="section-heading shop-heading">
              <div>
                <span className="eyebrow">
                  <span className="eyebrow-dot" /> THE GOOD STUFF
                </span>
                <h2>
                  {search
                    ? `Looking for “${search}”?`
                    : activeCategory === "All groceries"
                      ? "Fresh picks, loved daily"
                      : activeCategory}
                </h2>
                <p>
                  {search
                    ? `${filteredProducts.length} match${filteredProducts.length === 1 ? "" : "es"} found across English & Hindi names`
                    : "A little something for every shelf in your kitchen."}
                </p>
              </div>
              <button
                className="see-all"
                onClick={() => {
                  setActiveCategory("All groceries");
                  setOnlyDeals(false);
                }}
              >
                See all products <ArrowRight size={15} />
              </button>
            </div>
            <div className="shop-toolbar">
              <div className="category-pills">
                {[
                  "All groceries",
                  "Fruits & vegetables",
                  "Dairy & breakfast",
                  "Atta, rice & dal",
                ].map((category) => (
                  <button
                    key={category}
                    className={activeCategory === category ? "pill-active" : ""}
                    onClick={() => setActiveCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="shop-tools">
                <button
                  className={`filter-toggle ${onlyDeals ? "filter-active" : ""}`}
                  onClick={() => setOnlyDeals((value) => !value)}
                >
                  <SlidersHorizontal size={15} /> Offers
                </button>
                <Select
                  aria-label="Sort products"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                >
                  <option value="popular">Most loved</option>
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                </Select>
              </div>
            </div>
            {filteredProducts.length ? (
              <div className="product-grid">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    quantity={cart[product.id] ?? 0}
                    onAdd={() => addProduct(product)}
                    onChange={(delta) => changeQuantity(product.id, delta)}
                    onOpen={() => setSelectedProduct(product)}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-search">
                <span>🧺</span>
                <h3>No matching groceries yet</h3>
                <p>Try another search or browse all of our fresh picks.</p>
                <button
                  className="primary-button"
                  onClick={() => {
                    setSearch("");
                    setActiveCategory("All groceries");
                    setOnlyDeals(false);
                  }}
                >
                  Browse all groceries <ArrowRight size={16} />
                </button>
              </div>
            )}
            <div className="shop-footnote">
              <Leaf size={16} /> Fresh picks are hand-selected each morning.
              Your pack size and price are always shown upfront.
            </div>
          </section>
          <section className="story-strip">
            <div className="story-quote">
              <span className="quote-mark">“</span>
              <p>
                Our mornings got a whole lot easier. Fresh sabzi at the door
                before the chai is done.
              </p>
              <div>
                <span className="quote-avatar">A</span>
                <span>
                  <strong>Ananya S.</strong>
                  <small>Sector 50, Noida · Jhatpat customer</small>
                </span>
                <span className="quote-stars">★★★★★</span>
              </div>
            </div>
            <div className="story-stat">
              <strong>
                30<span>min</span>
              </strong>
              <p>
                Less waiting.
                <br />
                More living.
              </p>
              <span className="stat-sun">✳</span>
            </div>
          </section>
        </>
      )}

      {view === "admin" && (
        <section className="dashboard-page">
          <div className="dashboard-header">
            <div>
              <span className="eyebrow">
                <span className="eyebrow-dot" /> STORE OPERATIONS
              </span>
              <h1>Your store, at a glance.</h1>
              <p>Welcome back, Jai. Here’s what’s happening today.</p>
            </div>
            <div className="dashboard-actions">
              <span className="today-pill">
                <span className="live-dot" /> Monday, 16 November
              </span>
              <button
                className="primary-button"
                onClick={() => {
                  setView("shop");
                  setCartOpen(true);
                }}
              >
                <ShoppingBag size={16} /> View storefront
              </button>
            </div>
          </div>
          <div className="admin-tabs">
            {["Overview", "Orders", "Inventory", "Rider view"].map((tab) => (
              <button
                key={tab}
                className={adminTab === tab ? "tab-active" : ""}
                onClick={() => {
                  setAdminTab(tab);
                  if (tab === "Rider view") openRiderView();
                }}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="stats-grid">
            {[
              {
                label: "Today’s revenue",
                value: currency(
                  orders.reduce((sum, order) => sum + order.total, 0) || 28450,
                ),
                delta: "+12.8%",
                note: "vs. last Monday",
                icon: "↗",
              },
              {
                label: "Orders today",
                value: String(orders.length || 38),
                delta: "+8.2%",
                note: "vs. last Monday",
                icon: "▤",
              },
              {
                label: "Avg. order value",
                value: currency(
                  orders.length
                    ? orders.reduce((sum, order) => sum + order.total, 0) /
                        orders.length
                    : 748,
                ),
                delta: "+3.4%",
                note: "vs. last Monday",
                icon: "₹",
              },
              {
                label: "Low stock items",
                value: String(
                  Object.values(stockLevels).filter((stock) => stock < 10)
                    .length || 3,
                ),
                delta: "Needs attention",
                note: "Restock soon",
                icon: "!",
              },
            ].map((stat, index) => (
              <article className={`stat-card stat-${index}`} key={stat.label}>
                <div className="stat-card-top">
                  <span>{stat.label}</span>
                  <b>{stat.icon}</b>
                </div>
                <strong>{stat.value}</strong>
                <small>
                  <span>{stat.delta}</span> {stat.note}
                </small>
              </article>
            ))}
          </div>
          <div className="dashboard-grid">
            <section className="admin-panel order-panel">
              <div className="panel-heading">
                <div>
                  <h2>
                    {adminTab === "Inventory"
                      ? "Inventory health"
                      : "Recent orders"}
                  </h2>
                  <p>
                    {adminTab === "Inventory"
                      ? "Keep your bestsellers in stock."
                      : "A little look at your latest orders."}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setAdminTab(
                      adminTab === "Inventory" ? "Overview" : "Orders",
                    )
                  }
                >
                  {adminTab === "Inventory" ? "Overview" : "View all"}{" "}
                  <ArrowRight size={14} />
                </button>
              </div>
              {adminTab === "Inventory" ? (
                <div className="inventory-list">
                  {catalog.slice(0, 6).map((product) => (
                    <div className="inventory-row" key={product.id}>
                      <Image
                        src={imageUrl(product.image)}
                        alt=""
                        width={80}
                        height={80}
                      />
                      <span>
                        <strong>{product.name}</strong>
                        <small>SKU · JM-{product.id.toUpperCase()}</small>
                      </span>
                      <span
                        className={`stock-chip ${(stockLevels[product.id] ?? product.stock) < 10 ? "stock-low" : ""}`}
                      >
                        {stockLevels[product.id] ?? product.stock} in stock
                      </span>
                      <div className="stock-adjust">
                        <button
                          onClick={() =>
                            setStockLevels((current) => ({
                              ...current,
                              [product.id]: Math.max(
                                0,
                                (current[product.id] ?? product.stock) - 1,
                              ),
                            }))
                          }
                          aria-label={`Reduce ${product.name} stock`}
                        >
                          <Minus size={13} />
                        </button>
                        <button
                          onClick={() =>
                            setStockLevels((current) => ({
                              ...current,
                              [product.id]:
                                (current[product.id] ?? product.stock) + 1,
                            }))
                          }
                          aria-label={`Increase ${product.name} stock`}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="admin-order-list">
                  {(orders.length
                    ? orders
                    : [
                        {
                          id: "JM804231",
                          date: demoOrderDate,
                          status: "Packing",
                          total: 685,
                          payment: "UPI",
                          name: "Aarav Mehta",
                          items: {},
                          slot: deliverySlots[2],
                          phone: "9876543210",
                          address: "Sector 50",
                          pincode: "201301",
                        },
                        {
                          id: "JM804228",
                          date: demoOrderDate,
                          status: "Confirmed",
                          total: 428,
                          payment: "Cash on delivery",
                          name: "Meera Kapoor",
                          items: {},
                          slot: deliverySlots[3],
                          phone: "9876543211",
                          address: "Sector 62",
                          pincode: "201301",
                        },
                        {
                          id: "JM804221",
                          date: demoOrderDate,
                          status: "Out for delivery",
                          total: 912,
                          payment: "UPI",
                          name: "Kabir Shah",
                          items: {},
                          slot: deliverySlots[4],
                          phone: "9876543212",
                          address: "Sector 18",
                          pincode: "201301",
                        },
                      ]
                  )
                    .slice(0, 5)
                    .map((order) => (
                      <div className="admin-order-row" key={order.id}>
                        <div className="order-customer-avatar">
                          {order.name.slice(0, 1)}
                        </div>
                        <span className="admin-order-id">
                          <strong>{order.id}</strong>
                          <small>
                            {order.name} ·{" "}
                            {new Date(order.date).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </small>
                        </span>
                        <Badge
                          className={`status-badge status-${order.status.toLowerCase().replaceAll(" ", "-")}`}
                        >
                          {order.status}
                        </Badge>
                        <strong className="admin-order-total">
                          {currency(order.total)}
                        </strong>
                        <Select
                          aria-label={`Update status for order ${order.id}`}
                          value={order.status}
                          onChange={(event) =>
                            updateOrderStatus(order.id, event.target.value)
                          }
                        >
                          <option>Placed</option>
                          <option>Confirmed</option>
                          <option>Packing</option>
                          <option>Out for delivery</option>
                          <option>Delivered</option>
                          <option>Cancelled</option>
                        </Select>
                      </div>
                    ))}
                </div>
              )}
            </section>
            <aside className="admin-panel side-panel">
              <div className="panel-heading">
                <div>
                  <h2>Delivery, today</h2>
                  <p>Good things, on the move.</p>
                </div>
                <Bike size={19} />
              </div>
              <div className="delivery-progress">
                <div className="progress-number">
                  32<span>/ 38</span>
                </div>
                <p>orders delivered</p>
                <div className="progress-bar">
                  <span style={{ width: "84%" }} />
                </div>
                <small>6 orders still on their way</small>
              </div>
              <div className="slot-summary">
                {deliverySlots.slice(1, 4).map((slot, index) => (
                  <div key={slot}>
                    <span>{slot.replace(" PM", "")}</span>
                    <div className="mini-progress">
                      <i style={{ width: `${[54, 84, 36][index]}%` }} />
                    </div>
                    <strong>{[4, 7, 3][index]}/8</strong>
                  </div>
                ))}
              </div>
              <button className="admin-outline" onClick={openRiderView}>
                <Bike size={15} /> Open rider view <ArrowRight size={14} />
              </button>
            </aside>
          </div>
          <div className="dashboard-note">
            <span>
              <ShieldCheck size={17} />
            </span>
            <p>
              <strong>You’re in demo mode.</strong> Changes stay in this browser
              and don’t affect a live store.
            </p>
            <button onClick={() => setView("shop")}>
              Back to shopping <ArrowRight size={14} />
            </button>
          </div>
        </section>
      )}

      {view === "rider" && (
        <section className="rider-page">
          <button className="back-link" onClick={() => setView("admin")}>
            <ArrowLeft size={16} /> Back to store console
          </button>
          <div className="rider-top">
            <span className="rider-emblem">
              <Bike size={27} />
            </span>
            <span>
              <small>JHATPAT RIDER VIEW · DEMO</small>
              <h1>Good afternoon, Arjun.</h1>
            </span>
            <span className="rider-online">
              <i /> On shift
            </span>
          </div>
          <div className="rider-summary">
            <span>
              <Package size={18} /> Your next delivery
            </span>
            <strong>
              1 stop <span>·</span> about 12 min
            </strong>
          </div>
          <article className="rider-order-card">
            <div className="rider-order-head">
              <div>
                <span className="order-label">ORDER {riderOrder.id}</span>
                <span className="rider-order-status">{activeRiderStatus}</span>
              </div>
              <strong>{currency(riderOrder.total)}</strong>
            </div>
            <div className="rider-customer">
              <span className="customer-avatar">
                {riderOrder.name.slice(0, 1)}
              </span>
              <div>
                <strong>{riderOrder.name}</strong>
                <span>{riderOrder.address}</span>
                <small>Noida, Uttar Pradesh · {riderOrder.pincode}</small>
              </div>
            </div>
            <div className="rider-actions">
              <a href={`tel:+91${riderOrder.phone}`}>
                <span>
                  <UserRound size={17} />
                </span>{" "}
                Call customer
              </a>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${riderOrder.address} Noida ${riderOrder.pincode}`)}`}
                target="_blank"
                rel="noreferrer"
              >
                <span>
                  <MapPin size={17} />
                </span>{" "}
                Open maps
              </a>
            </div>
            <div className="rider-order-items">
              <strong>
                In the bag <span>{riderItems.length} items</span>
              </strong>
              {riderItems.map(
                ({ product, quantity }) =>
                  product && (
                    <div key={product.id}>
                      <span>{product.name}</span>
                      <small>
                        {product.pack} × {quantity}
                      </small>
                    </div>
                  ),
              )}
            </div>
            {activeRiderStatus === "Out for delivery" ? (
              <button
                className="rider-primary-button"
                onClick={() => setRiderStatus("Picked up")}
              >
                <Package size={17} /> Mark as picked up <ArrowRight size={16} />
              </button>
            ) : activeRiderStatus === "Picked up" ? (
              <div className="rider-complete">
                <label className="field">
                  <span>
                    Customer delivery OTP <em>demo code: 1234</em>
                  </span>
                  <Input
                    value={deliveryOtp}
                    onChange={(event) => setDeliveryOtp(event.target.value)}
                    placeholder="Enter 4-digit code"
                    inputMode="numeric"
                    maxLength={4}
                  />
                </label>
                <button
                  className="rider-primary-button"
                  onClick={() => {
                    if (deliveryOtp !== "1234") {
                      toast({
                        title: "That code doesn’t match. Try 1234.",
                        status: "error",
                        duration: 2500,
                      });
                      return;
                    }
                    setRiderStatus("Delivered");
                    updateOrderStatus(riderOrder.id, "Delivered");
                    toast({
                      title: "Order delivered. Lovely work!",
                      status: "success",
                      duration: 3000,
                    });
                  }}
                >
                  <Check size={17} /> Confirm delivery with OTP
                </button>
              </div>
            ) : (
              <div className="rider-delivered">
                <span>
                  <Check size={23} />
                </span>
                <strong>Safely delivered!</strong>
                <p>
                  This order is complete. Thank you,{" "}
                  {riderOrder.name.split(" ")[0]}.
                </p>
                <button onClick={() => setView("admin")}>
                  Back to store console <ArrowRight size={15} />
                </button>
              </div>
            )}
          </article>
          <p className="rider-footer">
            <ShieldCheck size={15} /> This demo view doesn’t share live customer
            information.
          </p>
        </section>
      )}

      <footer className="site-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <button
              className="brand"
              onClick={() => {
                setView("shop");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <span className="brand-mark">
                <Leaf size={21} fill="currentColor" />
              </span>
              <span className="brand-name">
                jhatpat<span>mart</span>
                <small>GOOD FOOD. RIGHT ON TIME.</small>
              </span>
            </button>
            <p>
              Your neighbourhood’s freshest groceries, delivered with a little
              extra care.
            </p>
            <div>
              <span>✦</span> Serving homes across Noida
            </div>
          </div>
          <div className="footer-links">
            <strong>Here to help</strong>
            <button
              onClick={() =>
                toast({
                  title: "We’re here for you",
                  description: "Call us at 1800-123-4567, 8am–10pm daily.",
                  status: "info",
                  duration: 3500,
                })
              }
            >
              Customer support
            </button>
            <button
              onClick={() =>
                toast({
                  title: "Your order, your way",
                  description:
                    "Cancel anytime before your order enters packing.",
                  status: "info",
                  duration: 3500,
                })
              }
            >
              Returns & cancellations
            </button>
            <button onClick={() => setView("admin")}>Store admin demo</button>
          </div>
          <div className="footer-help">
            <span>NEED A HAND?</span>
            <strong>
              Good humans.
              <br />
              Happy to help.
            </strong>
            <button
              onClick={() =>
                toast({
                  title: "Call our Noida team",
                  description: "1800-123-4567 · 8am–10pm, every day.",
                  status: "info",
                  duration: 3500,
                })
              }
            >
              1800-123-4567 <ArrowRight size={15} />
            </button>
            <small>Available 8am–10pm, every day</small>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 JhatpatMart · Made with care in Noida</span>
          <span>
            <ShieldCheck size={14} /> Safe, simple & secure
          </span>
          <span>Privacy · Terms · Contact</span>
        </div>
      </footer>

      {cartCount > 0 && view === "shop" && (
        <button className="mobile-cart-bar" onClick={() => setCartOpen(true)}>
          <span>
            <ShoppingBag size={18} /> {itemCountText}
          </span>
          <strong>
            View basket <ArrowRight size={16} />
          </strong>
          <b>{currency(total)}</b>
        </button>
      )}

      {cartOpen && (
        <div
          className="drawer-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCartOpen(false);
          }}
        >
          <aside
            className="cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Your basket"
          >
            <div className="drawer-heading">
              <div>
                <span className="eyebrow">YOUR GOOD THINGS</span>
                <h2>
                  Your basket <span>({cartCount})</span>
                </h2>
              </div>
              <button
                className="modal-close"
                onClick={() => setCartOpen(false)}
                aria-label="Close basket"
              >
                <X size={20} />
              </button>
            </div>
            {cartCount === 0 ? (
              <div className="empty-basket">
                <span>🧺</span>
                <h3>Something fresh is missing.</h3>
                <p>Your basket is waiting for its first good thing.</p>
                <button
                  className="primary-button"
                  onClick={() => {
                    setCartOpen(false);
                    document
                      .getElementById("shop")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Find my groceries <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="delivery-promise">
                  <span>
                    <Truck size={16} />
                  </span>
                  <div>
                    <strong>At your door in 30 minutes</strong>
                    <small>Picked fresh from our Noida dark store</small>
                  </div>
                  <BadgeCheck size={17} />
                </div>
                <div className="drawer-items">
                  {catalog
                    .filter((product) => cart[product.id])
                    .map((product) => (
                      <div className="drawer-item" key={product.id}>
                        <Image
                          src={imageUrl(product.image)}
                          alt=""
                          width={112}
                          height={112}
                        />
                        <div className="drawer-item-info">
                          <strong>{product.name}</strong>
                          <small>
                            {product.pack} · {product.brand}
                          </small>
                          <div>
                            <b>{currency(product.price)}</b>
                            <del>{currency(product.mrp)}</del>
                          </div>
                        </div>
                        <div className="quantity-control">
                          <button
                            onClick={() => changeQuantity(product.id, -1)}
                            aria-label={`Remove one ${product.name}`}
                          >
                            <Minus size={13} />
                          </button>
                          <span>{cart[product.id]}</span>
                          <button
                            onClick={() => changeQuantity(product.id, 1)}
                            aria-label={`Add one ${product.name}`}
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
                <button
                  className="continue-shopping"
                  onClick={() => {
                    setCartOpen(false);
                    document
                      .getElementById("shop")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <Plus size={15} /> Add a little more
                </button>
                <div className="coupon-box">
                  <span>
                    <Sparkles size={16} />
                  </span>
                  <div>
                    <strong>Have a little treat?</strong>
                    <small>10% off orders over ₹299 with FRESH10</small>
                  </div>
                  <div className="coupon-entry">
                    <input
                      value={couponInput}
                      onChange={(event) =>
                        setCouponInput(event.target.value.toUpperCase())
                      }
                      placeholder="CODE"
                      aria-label="Coupon code"
                    />
                    <button onClick={applyCoupon}>
                      {couponApplied ? "Applied" : "Apply"}
                    </button>
                  </div>
                </div>
                <div className="basket-summary">
                  <div>
                    <span>
                      Subtotal <small>({itemCountText})</small>
                    </span>
                    <span>{currency(subtotal)}</span>
                  </div>
                  {couponApplied && (
                    <div className="discount-line">
                      <span>FRESH10 discount</span>
                      <span>−{currency(discount)}</span>
                    </div>
                  )}
                  <div>
                    <span>
                      Delivery{" "}
                      <small>
                        {subtotal >= 399
                          ? "You’ve unlocked free delivery"
                          : "Free over ₹399"}
                      </small>
                    </span>
                    <span>
                      {deliveryFee === 0 ? (
                        <b className="free-label">FREE</b>
                      ) : (
                        currency(deliveryFee)
                      )}
                    </span>
                  </div>
                  <div className="basket-total">
                    <strong>Total</strong>
                    <strong>{currency(total)}</strong>
                  </div>
                  <small className="tax-note">
                    Inclusive of all applicable taxes
                  </small>
                </div>
                {subtotal < 149 && (
                  <div className="minimum-note">
                    <span>Almost there!</span> Add {currency(149 - subtotal)}{" "}
                    more to reach our ₹149 minimum.
                  </div>
                )}
                <button
                  className="drawer-checkout"
                  onClick={openCheckout}
                  disabled={subtotal < 149}
                >
                  Go to checkout <span>{currency(total)}</span>{" "}
                  <ArrowRight size={17} />
                </button>
                <p className="safe-checkout">
                  <ShieldCheck size={14} /> A secure, fuss-free checkout.
                  Always.
                </p>
              </>
            )}
          </aside>
        </div>
      )}

      {checkoutOpen && (
        <Modal
          title="A fresh delivery, coming right up."
          eyebrow="CHECKOUT · JUST A FEW DETAILS"
          onClose={() => setCheckoutOpen(false)}
          wide
        >
          <p className="modal-intro">
            Tell us where to bring the good stuff, then pick a time that works
            for you.
          </p>
          {openCheckoutForm}
        </Modal>
      )}

      {accountOpen && (
        <Modal
          title={
            account ? "Your Jhatpat account." : "Welcome to the good side."
          }
          eyebrow={account ? "YOUR ACCOUNT" : "A LITTLE HELLO"}
          onClose={() => setAccountOpen(false)}
        >
          {account ? (
            <div className="account-card">
              <span className="account-avatar">{account.name.slice(0, 1)}</span>
              <div>
                <strong>{account.name}</strong>
                <small>+91 {account.phone}</small>
              </div>
              <button
                onClick={() => {
                  setAccount(null);
                  localStorage.removeItem(ACCOUNT_KEY);
                  toast({
                    title: "You’ve signed out.",
                    status: "info",
                    duration: 2000,
                  });
                }}
              >
                Sign out
              </button>
              <div className="account-orders">
                <strong>Your recent orders</strong>
                {orders.length ? (
                  orders.slice(0, 3).map((order) => (
                    <button
                      key={order.id}
                      onClick={() => {
                        setActiveOrder(order);
                        setAccountOpen(false);
                      }}
                    >
                      <span>
                        {order.id}
                        <small>
                          {new Date(order.date).toLocaleDateString("en-IN")}
                        </small>
                      </span>
                      <span>
                        {order.status}
                        <ChevronRight size={14} />
                      </span>
                    </button>
                  ))
                ) : (
                  <p>Your orders will show up here.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="login-flow">
              <p>
                Sign in for quick checkout, easy reorders, and all your
                favourite groceries in one place.
              </p>
              {loginStep === "phone" ? (
                <>
                  <label className="field">
                    <span>Mobile number</span>
                    <div className="phone-input">
                      <span>+91</span>
                      <Input
                        value={loginPhone}
                        onChange={(event) =>
                          setLoginPhone(
                            event.target.value.replace(/\D/g, "").slice(0, 10),
                          )
                        }
                        inputMode="numeric"
                        placeholder="10-digit number"
                        autoFocus
                      />
                    </div>
                  </label>
                  <button
                    className="primary-button login-submit"
                    onClick={startLogin}
                  >
                    Send me an OTP <ArrowRight size={16} />
                  </button>
                </>
              ) : (
                <>
                  <label className="field">
                    <span>
                      Enter the 4-digit code <em>demo code: 1234</em>
                    </span>
                    <Input
                      value={loginOtp}
                      onChange={(event) => setLoginOtp(event.target.value)}
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="• • • •"
                      autoFocus
                    />
                  </label>
                  <button
                    className="primary-button login-submit"
                    onClick={finishLogin}
                  >
                    Verify & sign in <ArrowRight size={16} />
                  </button>
                  <button
                    className="back-link"
                    onClick={() => setLoginStep("phone")}
                  >
                    <ArrowLeft size={14} /> Change number
                  </button>
                </>
              )}
              <small className="privacy-note">
                <ShieldCheck size={13} /> Your number stays yours. We never
                share your details.
              </small>
            </div>
          )}
        </Modal>
      )}

      {selectedProduct && (
        <Modal
          title={selectedProduct.name}
          eyebrow={`${selectedProduct.brand} · ${selectedProduct.category}`}
          onClose={() => setSelectedProduct(null)}
          wide
        >
          <div className="product-detail">
            <div className={`detail-image ${selectedProduct.color}`}>
              <Image
                src={imageUrl(selectedProduct.image)}
                alt={selectedProduct.name}
                fill
                sizes="(max-width: 520px) 100vw, 300px"
              />
            </div>
            <div className="detail-copy">
              <span className="detail-rating">
                <Star size={15} fill="currentColor" /> {selectedProduct.rating}{" "}
                <small>· Loved by Noida homes</small>
              </span>
              <p>
                {selectedProduct.hindiName} · {selectedProduct.pack}
              </p>
              <p>
                Freshly selected for you. Carefully packed and delivered to your
                doorstep at just the right time.
              </p>
              <div className="detail-price">
                <strong>{currency(selectedProduct.price)}</strong>
                <del>{currency(selectedProduct.mrp)}</del>
                <Badge colorScheme="green">Inclusive of GST</Badge>
              </div>
              <div className="stock-availability">
                <span /> In stock — only {selectedProduct.stock} packs left
                today
              </div>
              <button
                className="primary-button detail-add"
                onClick={() => {
                  addProduct(selectedProduct);
                  setSelectedProduct(null);
                }}
              >
                Add to basket <Plus size={16} />
              </button>
              <div className="detail-guarantee">
                <Truck size={16} /> Delivered fresh in about 30 minutes
              </div>
            </div>
          </div>
        </Modal>
      )}

      {activeOrder && (
        <Modal
          title={
            activeOrder.status === "Delivered"
              ? "Delivered with care."
              : "Good things are on their way."
          }
          eyebrow={`ORDER ${activeOrder.id}`}
          onClose={() => setActiveOrder(null)}
          wide
        >
          <div className="tracking-summary">
            <div className="tracking-icon">
              <Package size={24} />
            </div>
            <div>
              <strong>
                {activeOrder.status === "Delivered"
                  ? "Delivered to your doorstep"
                  : `${activeOrder.status} and counting`}
              </strong>
              <span>
                {new Date(activeOrder.date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                })}{" "}
                · {activeOrder.slot}
              </span>
            </div>
            <Badge colorScheme="green">{currency(activeOrder.total)}</Badge>
          </div>
          <div className="tracking-timeline">
            {[
              "Placed",
              "Confirmed",
              "Packing",
              "Out for delivery",
              "Delivered",
            ].map((status, index) => {
              const stages = [
                "Placed",
                "Confirmed",
                "Packing",
                "Out for delivery",
                "Delivered",
              ];
              const currentIndex = stages.indexOf(activeOrder.status);
              const done = index <= currentIndex;
              return (
                <div
                  key={status}
                  className={`timeline-stage ${done ? "stage-done" : ""}`}
                >
                  <span>{done ? <Check size={13} /> : index + 1}</span>
                  <strong>{status}</strong>
                  {index < 4 && <i />}
                </div>
              );
            })}
          </div>
          <div className="tracked-items">
            <strong>Your basket, beautifully packed</strong>
            {Object.entries(activeOrder.items).map(([id, quantity]) => {
              const product = catalog.find((item) => item.id === id);
              return product ? (
                <div key={id}>
                  <span>
                    {product.name} <small>× {quantity}</small>
                  </span>
                  <b>{currency(product.price * quantity)}</b>
                </div>
              ) : null;
            })}
          </div>
          <div className="order-modal-actions">
            <button
              className="secondary-button"
              onClick={() => beginReorder(activeOrder)}
            >
              <Package size={15} /> Reorder these items
            </button>
            {(activeOrder.status === "Placed" ||
              activeOrder.status === "Confirmed") && (
              <button
                className="cancel-order-button"
                onClick={() => {
                  updateOrderStatus(activeOrder.id, "Cancelled");
                  toast({
                    title: "Order cancelled",
                    description: "You cancelled before packing began.",
                    status: "info",
                    duration: 2800,
                  });
                }}
              >
                Cancel order
              </button>
            )}
          </div>
          <p className="demo-caption">
            <ShieldCheck size={14} /> This is a local demo order. No payment or
            notification was sent.
          </p>
        </Modal>
      )}

      <div className="toast-region" aria-live="polite" />
    </main>
  );
}
