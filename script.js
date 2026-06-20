


// --- THE MASTER KEY CATCHER (Add to your Main Site's script.js) ---
// --- THE MASTER KEY CATCHER (Final Version) ---
const params = new URLSearchParams(window.location.search);
const token = params.get('impersonateToken');

if (token) {
  // 1. Clean the URL immediately so the token disappears
  window.history.replaceState({}, document.title, "/");

  // 2. Wait a split second for Firebase to be fully awake
  setTimeout(() => {
    console.log("Boss Kingsley: Unlocking user account...");

    // 3. Use the token to log in
    // NOTE: Make sure 'signInWithCustomToken' is imported at the top!
    signInWithCustomToken(auth, token)
      .then((userCredential) => {
        console.log("Success! Logged in as:", userCredential.user.email);

        // 4. Set the 'Boss' flag
        sessionStorage.setItem("isImpersonating", "true");

        // 5. CRITICAL: Refresh the page so your site 
        // realizes it should show the dashboard now
        window.location.reload();
      })
      .catch((err) => {
        console.error("Login failed:", err.message);
        alert("The secure link expired. Please try again from the Admin Panel.");
      });
  }, 500); // 500ms is enough to let the script breathe
}



// ===================== FIREBASE & FIRESTORE SETUP ======================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  increment,
  query,
  where,
  arrayUnion,
  runTransaction,
  serverTimestamp,
  orderBy,
  limit,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signInWithCustomToken,
  signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

// 1. MAIN Database Config (The one you've been using)
const mainConfig = {
  apiKey: "AIzaSyBw97sFAJ4_LvL5B4SIVmOX_M9F-CcfBio",
  authDomain: "flash-sales-8f768.firebaseapp.com",
  projectId: "flash-sales-8f768",
  storageBucket: "flash-sales-8f768.firebasestorage.app",
  messagingSenderId: "1048280668943",
  appId: "1:1048280668943:web:4e8cec214a1bd2e3e57c7a",
  measurementId: "G-V1J2MYF0H1"
};


// 2. HEAVY LOAD Database Config (The new one for Deposits/Withdrawals)
const heavyLoadConfig = {
  apiKey: "AIzaSyB31b1NhUPNpTFlxe8FpwrDu6kiwKR5IhA",
  authDomain: "oga-viral.firebaseapp.com",
  projectId: "oga-viral",
  storageBucket: "oga-viral.firebasestorage.app",
  messagingSenderId: "1003908808185",
  appId: "1:1003908808185:web:e6378ca372888d2080d128",
  measurementId: "G-E48F3DS2CP"
};

// 3. CORE NEXT Database Config (The third instance)
const coreNextConfig = {
  apiKey: "AIzaSyAlglNiJCX2BDC-RfbD_438f26r6L8Kq7w",
  authDomain: "ads-manager-b7cf2.firebaseapp.com",
  projectId: "ads-manager-b7cf2",
  storageBucket: "ads-manager-b7cf2.firebasestorage.app",
  messagingSenderId: "45297966034",
  appId: "1:45297966034:web:58941a5de594dfabec460b",
  measurementId: "G-N0MY6616BK"
};

// --- INITIALIZATION ---

// Initialize Main App (Default)
const app = initializeApp(mainConfig);
const db = getFirestore(app); // Use 'db' for profiles, auth, etc.
const auth = getAuth(app);    // Use this for Login

// Initialize Heavy Load App (Named)
const heavyApp = initializeApp(heavyLoadConfig, "heavyApp");
const transactionDb = getFirestore(heavyApp); // Use 'transactionDb' for deposits/withdrawals

const coreNextApp = initializeApp(coreNextConfig, "coreNextApp");
const coreNextDb = getFirestore(coreNextApp); // Use 'coreNextDb' to read/write to this third database

console.log("Main App loaded:", app.name);
console.log("HeavyLoad App loaded:", heavyApp.name);
console.log("CoreNext App loaded:", coreNextApp.name);
// ======================================================================


// ------------------ Setup Referral ------------------
async function setupReferral(user) {
  if (!user || !user.uid) return;

  try {
    // 1. Fetch User Data First
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const data = userSnap.data();
    let referralId = data.referralId;

    if (!referralId) {
      referralId = generateReferralId();
      await updateDoc(userRef, { referralId });
    }

    // 2. Set the short code
    const inviteCodeBox = document.getElementById("inviteCode");
    if (inviteCodeBox) inviteCodeBox.textContent = referralId;

    // 3. SEPARATE UI UPDATE: This ensures it runs regardless of timing
    updateReferralLinkUI(referralId);

  } catch (error) {
    console.error("Error in setupReferral:", error);
  }
}

// Separate function for the link so it can be called again when settings load
function updateReferralLinkUI(referralId) {
  const refInput = document.getElementById("refLink");
  if (!refInput) return;

  // Use the cached settings or fallback
  let baseUrl = window._cachedSettings?.referralBaseUrl || "https://samsung-snapdragon.website/#?ref=";

  if (baseUrl.startsWith("http") && !baseUrl.includes("://")) {
    baseUrl = baseUrl.replace("http", "http:");
  }

  const finalUrl = baseUrl.includes("?ref=")
    ? `${baseUrl}${referralId}`
    : `${baseUrl.replace(/\/$/, "")}/?ref=${referralId}`;

  refInput.value = finalUrl;
}

let autoClaimStarted = false;
let isAppInitialized = false;
let balanceAmount; // This will hold your balance display element


window.FintechNotify = {
  base: Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3200,
    timerProgressBar: true,
    background: '#ffffff',
    color: '#111',
    customClass: {
      popup: 'fintech-toast-offset'
    }
  }),

  success(title, text = '') {
    return this.base.fire({ icon: 'success', title, text });
  },
  info(title, text = '') {
    return this.base.fire({ icon: 'info', title, text });
  },
  warning(title, text = '') {
    return this.base.fire({ icon: 'warning', title, text });
  },
  error(title, text = '') {
    return this.base.fire({ icon: 'error', title, text });
  }
};

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true
});





/**
 * Global Toast Notification
 * @param {string} message - The text to display
 * @param {string} type - 'success', 'error', or 'warning'
 */
window.showToast = function (message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `modern-toast toast-${type}`;

  // Icon Logic
  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-circle-xmark';
  if (type === 'warning') icon = 'fa-triangle-exclamation';

  toast.innerHTML = `
        <i class="fa-solid ${icon} toast-icon"></i>
        <span>${message}</span>
    `;

  container.appendChild(toast);

  // Slide in from right
  setTimeout(() => toast.classList.add('show'), 50);

  // Stay for 3 seconds, then slide back out
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
};



let currentDepositId = null;
let countdownTimer = null;

// ======================================================
// CHANGE PAGE
// ======================================================
function changePage(pageId) {
  document.querySelectorAll('.page-section').forEach(page => {
    page.style.display = 'none';
  });

  const target = document.getElementById(pageId);
  if (target) {
    target.style.display = 'block';
    localStorage.setItem('lastPage', pageId);
  }
}

// ======================================================
// DOM READY
// ======================================================
document.addEventListener('DOMContentLoaded', () => {
  const wasLoggedIn = localStorage.getItem('isLoggedIn');
  const validPages = ['dashboard', 'productPage', 'rechargePage', 'withdrawPage', 'recordsPage', 'invitePage', 'profilePage', 'bankPage', 'teamPage', 'myInvestmentPage', 'earningsPage'];
  const savedPage = localStorage.getItem('lastPage');
  const safePage = validPages.includes(savedPage) ? savedPage : 'dashboard';

  if (wasLoggedIn === 'true') {
    // Hide all pages first
    document.querySelectorAll('.page-section').forEach(p => p.style.display = 'none');

    // Show saved page
    const targetPage = document.getElementById(safePage);
    if (targetPage) targetPage.style.display = 'block';

    // Show navbar
    const bottomNav = document.getElementById("bottomNav");
    if (bottomNav) bottomNav.classList.add('open');
  }
});

// ======================================================
// AUTH STATE LISTENER
// ======================================================
onAuthStateChanged(auth, async (user) => {
  const body = document.body;
  const loginContainer = document.getElementById('loginContainer');
  const signupContainer = document.getElementById('signupContainer');
  const dashboard = document.getElementById('dashboard');

  body.classList.remove('auth-loading');

  if (!user) {
    isAppInitialized = false;
    autoClaimStarted = false;
    localStorage.setItem('isLoggedIn', 'false');
    localStorage.removeItem('lastPage');

    body.classList.remove('logged-in');

    pages.forEach(p => { if (p) p.style.display = 'none'; });

    const bottomNav = document.getElementById("bottomNav");
    if (bottomNav) bottomNav.classList.remove('open');

    if (signupContainer) signupContainer.style.setProperty('display', 'none', 'important');
    if (loginContainer) loginContainer.style.setProperty('display', 'block', 'important');
    return;
  }

  // USER IS LOGGED IN
  localStorage.setItem('isLoggedIn', 'true');
  body.classList.add('logged-in');

  if (loginContainer) loginContainer.style.setProperty('display', 'none', 'important');
  if (signupContainer) signupContainer.style.setProperty('display', 'none', 'important');

  const validPages = ['dashboard', 'productPage', 'rechargePage', 'withdrawPage', 'recordsPage', 'invitePage', 'profilePage', 'bankPage', 'teamPage', 'myInvestmentPage', 'earningsPage'];
  const savedPage = localStorage.getItem('lastPage');
  const safePage = validPages.includes(savedPage) ? savedPage : 'dashboard';

  // Hide all pages first
  pages.forEach(p => { if (p) p.style.display = 'none'; });

  // Show saved page
  const pageToDisplay = document.getElementById(safePage);
  if (pageToDisplay) pageToDisplay.style.display = 'block';

  // Show navbar
  const bottomNav = document.getElementById('bottomNav');
  if (bottomNav) bottomNav.classList.add('open');

  if (isAppInitialized) return;

  // Only show welcome popup on fresh login not refresh
  if (!savedPage) {
    const welcomePopup = document.getElementById('welcomePopup');
    if (welcomePopup) welcomePopup.style.display = 'flex';
  }

  console.log("Initializing user data...");
  await loadBalance();
  startAutoClaim();


  isAppInitialized = true;
});

// ======================================================
// POPUP FUNCTION
// ======================================================
function showWelcomePopup() {
  const welcomePopup = document.getElementById('welcomePopup');
  if (welcomePopup) {
    welcomePopup.style.display = 'flex';
  }
}

// ======================================================
// POST-LOGIN (only on fresh login)
// ======================================================
function afterLogin() {
  showWelcomePopup();
}

// ======================================================
// SHOW / HIDE AUTH FORMS
// ======================================================
function showSignup() {
  const loginContainer = document.getElementById('loginContainer');
  const signupContainer = document.getElementById('signupContainer');
  if (loginContainer) loginContainer.style.setProperty('display', 'none', 'important');
  if (signupContainer) signupContainer.style.setProperty('display', 'block', 'important');
}

function showLogin() {
  const signupContainer = document.getElementById('signupContainer');
  const loginContainer = document.getElementById('loginContainer');
  if (signupContainer) signupContainer.style.setProperty('display', 'none', 'important');
  if (loginContainer) loginContainer.style.setProperty('display', 'block', 'important');
}

window.showLogin = showLogin;
window.showSignup = showSignup;

// ======================================================
// PROFILE
// ======================================================
window.openProfile = function () {
  console.log("Profile clicked!");
  const profileModal = document.getElementById("profileModal");
  if (profileModal) profileModal.style.display = "block";
};

function showAlert(message) {
  const alertBox = document.getElementById('customAlert');
  alertBox.textContent = message;
  alertBox.style.opacity = '1';
  alertBox.style.transform = 'translateY(0)';

  // Hide after 3 seconds
  setTimeout(() => {
    alertBox.style.opacity = '0';
    alertBox.style.transform = 'translateY(-20px)';
  }, 3000);
}


function showLoader(options) {
  const loader = document.getElementById('pageLoader');
  loader.style.display = 'flex';
  loader.style.opacity = '1';

  // options: { callback: function, url: string }
  const { callback, url } = options || {};

  setTimeout(() => {
    loader.style.opacity = '0';
    setTimeout(() => {
      loader.style.display = 'none';
      if (typeof callback === 'function') {
        callback();  // run JS action (signup/login)
      } else if (url) {
        window.location.href = url; // redirect to page
      }
    }, 500); // fade-out duration
  }, 3000); // loader visible for 3 seconds
}


// Function to simulate page load
function loadPage(url) {
  const loader = document.getElementById('pageLoader');
  loader.style.opacity = '1';
  loader.style.display = 'flex';

  // After 3 seconds, redirect or show content
  setTimeout(() => {
    loader.style.opacity = '0';
    setTimeout(() => {
      loader.style.display = 'none';
      // If real page redirect:
      window.location.href = url;
      // If single-page content, you can instead show/hide sections here
    }, 500);
  }, 3000);
}


// Elements
const signupContainer = document.getElementById('signupContainer');
const loginContainer = document.getElementById('loginContainer');
const dashboard = document.getElementById('dashboard');


// Initial display
signupContainer.classList.add('active');




// --- GLOBAL CONFIG & LOCKS ---
const MS_IN_DAY = 24 * 60 * 60 * 1000;
let isSyncingNow = false; // 🔒 The "Guard" that stops double drops

// ====================== AUTO-FILL REFERRAL ======================
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.hash.substring(1));
  const ref = urlParams.get('ref');
  if (ref) {
    const referralInput = document.getElementById('referral');
    if (referralInput) referralInput.value = ref;
  }
});


// ====================== SIGNUP ======================
document.getElementById('signupForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const loader = document.getElementById('pageLoader');
  loader.style.display = 'flex';
  loader.style.opacity = '1';

  const number = document.getElementById('number').value.trim();
  const password = document.getElementById('password').value.trim();
  const confirmPassword = document.getElementById('confirmPassword').value.trim();
  const referral = document.getElementById('referral').value.trim();

  if (!number || !password || !confirmPassword) {
    loader.style.display = 'none';
    window.showToast('Validation Failed: All fields are required!', 'error');
    return;
  }

  if (password !== confirmPassword) {
    loader.style.display = 'none';
    window.showToast('Validation Failed: Passwords do not match!', 'error');
    return;
  }
  try {
    const fakeEmail = `${number}@user.com`;

    // 1️⃣ Create auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      fakeEmail,
      password
    );
    const user = userCredential.user;

    // 2️⃣ Generate referral ID
    const referralId =
      Array.from({ length: 3 }, () =>
        String.fromCharCode(65 + Math.floor(Math.random() * 26))
      ).join('') + Math.floor(100 + Math.random() * 900);

    // 3️⃣ Resolve referrer
    let referrerId = "";
    let grandReferrerId = "";

    if (referral) {
      const refQuery = query(
        collection(db, "users"),
        where("referralId", "==", referral)
      );
      const refSnap = await getDocs(refQuery);

      if (!refSnap.empty) {
        referrerId = refSnap.docs[0].id;
        grandReferrerId = refSnap.docs[0].data().referrerId || "";
      }
    }

    // --- Step 4.0: Get the Bonus you set in Admin Panel ---
    let dynamicBonus = 500; // This is only the backup if the DB fails
    try {
      // CHANGE THIS LINE to match your Admin Panel path
      const adminSnap = await getDoc(doc(db, "adminSettings", "globals"));

      if (adminSnap.exists()) {
        // Use the value from your Admin Panel
        const cloudBonus = adminSnap.data().welcomeBonus;

        // If there is a value in the cloud, use it. Otherwise, stay at 700.
        if (cloudBonus !== undefined && cloudBonus !== null) {
          dynamicBonus = Number(cloudBonus);
        }
      }
    } catch (e) {
      console.error("Error fetching admin bonus:", e);
    }

    // --- Step 4.1: Create Firestore user document ---
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      number,
      referral: referral || "",
      referralId,
      referrerId,

      // USE THE DYNAMIC BONUS HERE
      balance: dynamicBonus,
      bonus: dynamicBonus,

      createdAt: new Date(),
      banned: false,

      referrals: {
        level1: [],
        level2: []
      },

      trackedInvestments: [],
      totalCommission: 0,
      availableCommissionLevel1: 0,
      availableCommissionLevel2: 0
    });


    // --- Step 4.2: UPDATE GLOBAL USER STATS (QUOTA SAVER) ---
    try {
      await setDoc(doc(db, "adminSettings", "stats"), {
        totalUsers: increment(1)
      }, { merge: true });
      console.log("Global user count incremented.");
    } catch (statsErr) {
      console.error("Failed to update global user count:", statsErr);
      // We don't stop the signup even if the stats update fails
    }


    // 5️⃣ Update referrer records
    if (referrerId) {
      await updateDoc(doc(db, "users", referrerId), {
        "referrals.level1": arrayUnion({
          uid: user.uid,
          number,
          createdAt: new Date()
        })
      });

      if (grandReferrerId) {
        await updateDoc(doc(db, "users", grandReferrerId), {
          "referrals.level2": arrayUnion({
            uid: user.uid,
            number,
            createdAt: new Date()
          })
        });
      }
    }

    // ✅ Auto-login after signup
    window.showToast('Signup Successful: Logging you in...', 'success');

    // Optionally show dashboard immediately
    showDashboard();
    startInvestmentSystem(user.uid);
  } catch (err) {
    console.error("Auth Error Code:", err.code);

    // Default message if we don't recognize the error
    let cleanMessage = "An unexpected error occurred. Please try again.";

    // 🛡️ CUSTOM CLEAN MESSAGES
    if (err.code === 'auth/email-already-in-use') {
      cleanMessage = "This mobile number is already registered.";
    } else if (err.code === 'auth/invalid-email') {
      cleanMessage = "Invalid mobile number format.";
    } else if (err.code === 'auth/weak-password') {
      cleanMessage = "Password is too weak. Please use at least 6 characters.";
    } else if (err.code === 'auth/network-request-failed') {
      cleanMessage = "Network error. Please check your connection.";
    } else if (err.code === 'auth/operation-not-allowed') {
      cleanMessage = "Signup is currently disabled.";
    }

    window.showToast(`Signup Failed: ${cleanMessage}`, 'error');

  } finally {
    // Hide the loader regardless of success or failure
    loader.style.opacity = '0';
    setTimeout(() => {
      loader.style.display = 'none';
    }, 500);
  }
});

// ====================== LOGIN ======================
document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const loader = document.getElementById('pageLoader');
  loader.style.display = 'flex';
  loader.style.opacity = '1';

  const loginNumber = document.getElementById('loginNumber').value.trim();
  const loginPassword = document.getElementById('loginPassword').value.trim();
  const fakeEmail = `${loginNumber}@user.com`;

  try {
    // 1️⃣ Sign in user
    const userCredential = await signInWithEmailAndPassword(
      auth,
      fakeEmail,
      loginPassword
    );
    const user = userCredential.user;

    // 2️⃣ Validate Firestore user
    const userDocRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      await signOut(auth);
      window.showToast('User Not Found: User record not found!', 'error');
      return;
    }

    if (userSnap.data().banned) {
      await signOut(auth);
      window.showToast('Account Banned: Your account has been banned. Contact support.', 'error');
      return;
    }

    // 3️⃣ Setup referral (safe, no UI)
    setupReferral(user);

    // 4️⃣ Real-time banned watcher
    onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().banned) {
        window.showToast('Account Banned: Your account has been banned. Logging out...', 'error');
        signOut(auth).then(() => window.location.reload());
      }
    });


    // Backfill old investment profits
    await backfillInvestmentRecords(user.uid);

    // ❌ NO UI LOGIC HERE
    // Auth state listener will handle dashboard & navbar

  } catch (error) {
    console.error("Login Error Code:", error.code);

    // ✅ PROFESSIONAL SECRECY: Don't tell them if it's the number or the password that is wrong.
    // This stops people from "probing" your database to see who is registered.
    let cleanMessage = "Invalid mobile number or password.";

    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      cleanMessage = "Invalid mobile number or password.";
    } else if (error.code === 'auth/user-disabled') {
      cleanMessage = "This account has been suspended. Please contact support.";
    } else if (error.code === 'auth/too-many-requests') {
      cleanMessage = "Too many failed attempts. Please try again later.";
    } else if (error.code === 'auth/network-request-failed') {
      cleanMessage = "Network error. Please check your internet connection.";
    }

    window.showToast(`Login Failed: ${cleanMessage}`, 'error');

  } finally {
    loader.style.opacity = '0';
    setTimeout(() => {
      loader.style.display = 'none';
    }, 500);
  }
});



// ======================================================
// FETCH PRODUCTS (OPTIMIZED FOR LOW QUOTA)
// ======================================================
async function listenToProducts() {
  const productContainer = document.getElementById("dynamicProductList");
  if (!productContainer) return;

  // Use a loading state for a premium feel
  productContainer.innerHTML = '<div class="mx-loader">Loading Plans...</div>';

  // ✅ Pointing to your secondary DB (transactionDb)
  const productsRef = collection(transactionDb, "products");

  try {
    // ✅ CHANGED: Use getDocs instead of onSnapshot to save reads & connections
    const snapshot = await getDocs(productsRef);

    productContainer.innerHTML = "";
    const productList = [];

    snapshot.forEach((docSnap) => {
      productList.push({ id: docSnap.id, ...docSnap.data() });
    });

    // MASTER SORT: VIP 1 to 12
    productList.sort((a, b) => {
      const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
      return numA - numB;
    });

    // Render sorted list
    productList.forEach((p) => {
      if (p.locked) return;


      const cardHtml = `
<div class="mx-product-card">

<div class="mx-logo-wrap">
    <img src="Tesla logo.jpg" alt="Logo" class="mx-logo">
  </div>

  <div class="mx-header-row">
    <h3 class="mx-plan-name">${p.name || 'VIP 1'}</h3>
    <p class="mx-investment-amt">Investment amount: ₦${Number(p.price || 0).toLocaleString()}</p>
  </div>

  <div class="mx-info-box">
    <div class="mx-metric">
      <span class="mx-label">Duration</span>
      <span class="mx-value">${p.cycle || 0} days</span>
    </div>
    <div class="mx-metric">
      <span class="mx-label">Daily Income</span>
      <span class="mx-value text-pink">₦${Number(p.dailyIncome || 0).toLocaleString()}</span>
    </div>
    <div class="mx-metric">
      <span class="mx-label">Total Earnings</span>
      <span class="mx-value">₦${Number(p.totalIncome || 0).toLocaleString()}</span>
    </div>
    <div class="mx-metric">
      <span class="mx-label">Status</span>
      <span class="mx-value">Active</span>
    </div>
  </div>

  <button class="mx-buy-btn" onclick="handleInvestment(${p.price}, ${p.dailyIncome}, ${p.cycle})">
    Buy Plan
  </button>
</div>
`;
      productContainer.insertAdjacentHTML("beforeend", cardHtml);
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    productContainer.innerHTML = '<div class="mx-error">Failed to load products. Please refresh.</div>';
  }
}

// Initialize on page load
listenToProducts();

auth.onAuthStateChanged(async (user) => {
  if (!user) return; // user not signed in, do nothing

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    let bonus = 0;

    if (userSnap.exists()) {
      const data = userSnap.data();
      bonus = data.bonus || 0;
    }



  } catch (error) {
    console.error("Error fetching user bonus:", error);

  }
});


auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  const userSnap = await getDoc(doc(db, "users", user.uid));
  if (!userSnap.exists()) return;

  const balance = userSnap.data().balance || 0;
  document.getElementById("userBalance").textContent = balance.toLocaleString();
});




auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  const data = snap.data();

  // PHONE NUMBER (top-left label)
  const phoneEl = document.getElementById("userPhoneNumber");
  if (phoneEl) {
    phoneEl.innerText = data.number || "";
  }

  // BALANCE
  const balanceEl = document.getElementById("balanceAmount");
  if (balanceEl) {
    balanceEl.innerText = `₦${(data.balance || 0).toLocaleString()}`;
  }
});

function logout() {
  const loader = document.getElementById('pageLoader');
  loader.style.display = 'flex';
  loader.style.opacity = '1';

  setTimeout(async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed:", err);
    }

    // Clear saved page
    localStorage.removeItem('lastPage');
    localStorage.setItem('isLoggedIn', 'false');

    // Hide all pages
    pages.forEach(p => { if (p) p.style.display = 'none'; });

    // Hide bottom nav
    const bottomNav = document.getElementById("bottomNav");
    if (bottomNav) bottomNav.classList.remove('open');

    // Show login page using setProperty to override !important
    const loginContainer = document.getElementById('loginContainer');
    const signupContainer = document.getElementById('signupContainer');
    if (signupContainer) signupContainer.style.setProperty('display', 'none', 'important');
    if (loginContainer) loginContainer.style.setProperty('display', 'block', 'important');

    // Hide loader
    loader.style.opacity = '0';
    setTimeout(() => { loader.style.display = 'none'; }, 500);

  }, 500);
}

window.logout = logout;

document.addEventListener("DOMContentLoaded", () => {
  const giftCodeBtn = document.getElementById("giftCodeBtn");

  giftCodeBtn.addEventListener("click", async () => {

    const loader = document.getElementById("dailyLoader");
    loader.style.display = "flex";

    const user = auth.currentUser;

    if (!user) {
      loader.style.display = "none";
      window.showToast('Please Login: You must be logged in!', 'warning');
      return;
    }

    const userRef = doc(db, "users", user.uid);

    try {

      const today = new Date().toISOString().split("T")[0];

      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        loader.style.display = "none";
        return;
      }

      const userData = userSnap.data();

      // Check active investment
      const hasActiveInvestment = Array.isArray(userData.investments) &&
        userData.investments.some(inv => inv.status === "active");

      if (!hasActiveInvestment) {
        loader.style.display = "none";
        window.showToast('Need to Purchase a Product: Please purchase a product to continue.', 'warning');
        return;
      }

      // Already claimed
      if (userData.lastDailyClaim === today) {
        loader.style.display = "none";

        FintechNotify.info(
          'Check-in completed',
          'You’ve already checked in today. Come back tomorrow.'
        );

        return;
      }
      // Give bonus
      await updateDoc(userRef, {
        balance: increment(150),
        bonus: increment(150),
        lastDailyClaim: today
      });

      // Save record
      await addDoc(collection(db, "users", user.uid, "records"), {
        type: "Daily Login",
        amount: 150,
        status: "Claimed",
        timestamp: serverTimestamp()
      });

      // Update balance realtime
      const balanceElem = document.getElementById("balanceAmount");
      if (balanceElem) {
        onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            balanceElem.textContent = `₦${(data.balance || 0).toLocaleString()}`;
          }
        });
      }

      window.showToast('Daily Login Successful: 🎁 ₦150 added.', 'success');
      loader.style.display = "none";

    } catch (err) {

      console.error("Daily login error:", err);
      loader.style.display = "none";
      window.showToast('Failed to Claim Daily Reward: Please try again later.', 'error');

    }
  });
});

async function updateBalance(amount) {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  try {
    await updateDoc(userRef, {
      balance: increment(amount) // Firestore atomic increment
    });
  } catch (err) {
    console.error("Failed to update balance:", err);
  }
}




auth.onAuthStateChanged((user) => {
  if (!user) return;

  const userRef = doc(db, "users", user.uid);

  onSnapshot(userRef, async (snap) => {
    const data = snap.data();
    if (!data) return;

    // -------------------- Update dashboard balance --------------------
    const balanceAmount = document.getElementById("balanceAmount");
    if (balanceAmount) {
      balanceAmount.textContent = `₦${data.balance.toLocaleString()}`;
    }

    // -------------------- Update total commission --------------------
    const totalCommissionEl = document.getElementById("totalCommission");
    if (totalCommissionEl) {
      const commissionsCol = collection(userRef, "commissions");
      const commissionsSnap = await getDocs(commissionsCol);
      let totalCommission = 0;
      commissionsSnap.forEach(doc => {
        const c = doc.data();
        totalCommission += c.amount || 0;
      });
      totalCommissionEl.textContent = `Total Commission: ₦${totalCommission.toLocaleString()}`;
    }

    // -------------------- Update team summary --------------------
    const totalReferralsEl = document.getElementById("totalReferrals");
    if (totalReferralsEl) {
      const level1Count = data.referrals?.level1?.length || 0;
      const level2Count = data.referrals?.level2?.length || 0;
      totalReferralsEl.textContent = `Total Referrals: ${level1Count + level2Count}`;
    }
  });
});


function openProfile() {
  // Hide all pages safely
  localStorage.setItem('lastPage', 'profilePage'); // ADD THIS
  sessionStorage.setItem('currentPage', 'profilePage'); // ADD THIS
  if (pages && pages.length) {
    pages.forEach(page => {
      if (page) page.style.display = 'none';
    });
  }

  if (productPage) productPage.style.display = 'none';

  const profilePage = document.getElementById("profilePage");
  if (profilePage) profilePage.style.display = "block";

  const bottomNav = document.getElementById("bottomNav");
  if (bottomNav) bottomNav.style.display = "flex";
}

// Make it global
window.openProfile = openProfile;


function showDashboard() {
  const loader = document.getElementById('pageLoader');
  loader.style.display = 'flex';
  loader.style.opacity = '1';

  setTimeout(() => {
    // Hide other pages
    document.getElementById("profilePage").style.display = "none";
    document.getElementById("productPage").style.display = "none";
    document.getElementById("bankPage").style.display = "none";

    // Show dashboard
    document.getElementById("dashboard").style.display = "block";

    // Show bottom nav
    document.getElementById("bottomNav").style.display = "flex";

    // Show welcome popup
    showWelcomePopup();

    // Hide loader
    loader.style.opacity = '0';
    setTimeout(() => { loader.style.display = 'none'; }, 500);
  }, 500); // small delay so loader is visible
}

// Make it global
window.showDashboard = showDashboard;


function backToProfile() {
  const loader = document.getElementById('pageLoader');
  loader.style.display = 'flex';
  loader.style.opacity = '1';

  setTimeout(() => {
    // Hide bank page
    document.getElementById("bankPage").style.display = "none";
    // Show profile page
    document.getElementById("profilePage").style.display = "block";

    // Show nav
    document.getElementById("bottomNav").style.display = "flex";

    // Hide loader
    loader.style.opacity = '0';
    setTimeout(() => { loader.style.display = 'none'; }, 500);
  }, 500); // small delay so loader is visible
}

// Make it global
window.backToProfile = backToProfile;


const banks = [
  { name: "Access Bank", code: "NGR044" },
  { name: "Ecobank Nigeria", code: "NGR050" },
  { name: "Enterprise Bank", code: "NGR000019" },
  { name: "Fidelity Bank", code: "NGR070" },
  { name: "First Bank of Nigeria", code: "NGR011" },
  { name: "First City Monument Bank", code: "NGR214" },
  { name: "Globus Bank", code: "NGR00103" },
  { name: "Guaranty Trust Bank", code: "NGR058" },
  { name: "Jaiz Bank", code: "NGR301" },
  { name: "Keystone Bank", code: "NGR082" },
  { name: "Kuda Bank", code: "NGR50211" },
  { name: "One Finance", code: "NGR565" },
  { name: "PalmPay", code: "NGR999991" },
  { name: "Parallex Bank", code: "NGR526" },
  { name: "Polaris Bank", code: "NGR076" },
  { name: "Providus Bank", code: "NGR101" },
  { name: "Stanbic IBTC Bank", code: "NGR221" },
  { name: "Standard Chartered Bank", code: "NGR068" },
  { name: "Sterling Bank", code: "NGR232" },
  { name: "Suntrust Bank", code: "NGR100" },
  { name: "Sparkle MFB", code: "NGR51310" },
  { name: "TAJ Bank", code: "NGR302" },
  { name: "Union Bank of Nigeria", code: "NGR032" },
  { name: "United Bank For Africa", code: "NGR033" },
  { name: "Unity Bank", code: "NGR215" },
  { name: "VFD Microfinance Bank", code: "NGR566" },
  { name: "Wema Bank", code: "NGR035" },
  { name: "Zenith Bank", code: "NGR057" },
  { name: "Abbey Mortgage Bank", code: "NGR801" },
  { name: "ALAT by WEMA", code: "NGR035A" },
  { name: "Paycom", code: "NGR999992" },
  { name: "Opay", code: "NGR20009" },
  { name: "FCMB Easy Account", code: "NGR100031" },
  { name: "Moniepoint MFB", code: "NGR999993" },
  { name: "Premium Trust Bank", code: "NGR031" },
  { name: "Paga", code: "NG0206" },
  { name: "Momo PSB", code: "NGR1543" },
];

// Populate bank dropdown
const bankSelectEl = document.getElementById('bankName');
if (bankSelectEl) {
  bankSelectEl.innerHTML = '<option value="">-- Select Bank --</option>';
  banks.forEach(bank => {
    const option = document.createElement('option');
    option.value = bank.code;
    option.textContent = bank.name;
    bankSelectEl.appendChild(option);
  });
}

// ----------------- Bank Navigation -----------------
function openBankPage() {
  const loader = document.getElementById('pageLoader');
  loader.style.display = 'flex';
  loader.style.opacity = '1';

  setTimeout(() => {
    pages.forEach(page => { if (page) page.style.display = 'none'; });
    document.getElementById('bankPage').style.display = 'block';
    loader.style.opacity = '0';
    setTimeout(() => loader.style.display = 'none', 500);
  }, 300);
}

document.getElementById('bankAccountBtn').addEventListener('click', openBankPage);

document.addEventListener('click', function (e) {
  if (e.target.id === 'addAccountBtn') openBankPage();
});

// ----------------- References -----------------
const bankForm = document.getElementById('bankForm');
const bankSuccess = document.getElementById('bankSuccess');
const bankSelect = document.getElementById('bankName');
const accNumInput = document.getElementById('accountNumber');
const accNameInput = document.getElementById('accountName');

const getSubmitBtn = () => bankForm?.querySelector('.honda-submit-btn') || bankForm?.querySelector('button[type="submit"]');

// 1. Auth Listener
auth.onAuthStateChanged((user) => {
  if (!user) return;

  const userRef = doc(db, "users", user.uid);

  onSnapshot(userRef, (snap) => {
    const bank = snap.data()?.bankAccount;
    const displayCard = document.getElementById("bankDetailsDisplay");
    const submitBtn = getSubmitBtn();
    const addAccountBtn = document.getElementById("addAccountBtn");
    const plusIcon = document.getElementById("plusIcon");
    const withdrawBankName = document.getElementById("withdrawBankName");

    if (bank) {
      if (displayCard) displayCard.style.display = "block";
      if (addAccountBtn) addAccountBtn.style.display = "none";
      if (plusIcon) plusIcon.style.display = "none";
      if (withdrawBankName) withdrawBankName.style.display = "block";

      if (document.getElementById("withdrawBankNameDisplay")) document.getElementById("withdrawBankNameDisplay").textContent = bank.bankName;
      if (document.getElementById("withdrawAccountName")) document.getElementById("withdrawAccountName").textContent = bank.accountName;

      const raw = bank.accountNumber;
      const withdrawAccountNumber = document.getElementById("withdrawAccountNumber");
      if (withdrawAccountNumber) {
        withdrawAccountNumber.textContent = (raw && raw.length >= 10) ? `${raw.slice(0, 4)} **** ${raw.slice(-4)}` : raw;
      }

      if (accNumInput) { accNumInput.value = bank.accountNumber; accNumInput.disabled = true; }
      if (accNameInput) { accNameInput.value = bank.accountName; accNameInput.disabled = true; }
      if (bankSelect) { bankSelect.value = bank.bankCode || ""; bankSelect.disabled = true; }
      if (submitBtn) submitBtn.style.display = 'none';
      if (bankSuccess) { bankSuccess.style.display = 'block'; bankSuccess.textContent = "Bank info saved permanently ✅"; }

    } else {
      if (displayCard) displayCard.style.display = "none";
      if (addAccountBtn) addAccountBtn.style.display = "block";
      if (plusIcon) plusIcon.style.display = "flex";
      if (submitBtn) submitBtn.style.display = 'block';
      if (bankSuccess) bankSuccess.style.display = 'none';
      if (accNumInput) { accNumInput.disabled = false; accNumInput.value = ""; }
      if (accNameInput) { accNameInput.disabled = false; accNameInput.value = ""; }
      if (bankSelect) { bankSelect.disabled = false; bankSelect.value = ""; }
    }
  });
});

// 2. Submission Logic
if (bankForm) {
  bankForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const submitBtn = getSubmitBtn();
    const originalBtnText = submitBtn?.innerText || "Update Details";
    const accountNameValue = accNameInput ? accNameInput.value.trim() : "";

    if (!bankSelect || !bankSelect.value) {
      return window.showToast('Please select your bank.', 'warning');
    }
    if (!accNumInput || accNumInput.value.trim().length !== 10) {
      return window.showToast('Account number must be 10 digits!', 'warning');
    }
    if (!accountNameValue || accountNameValue.length < 3) {
      return window.showToast('Please enter your account name.', 'warning');
    }

    if (submitBtn) { submitBtn.innerText = "Saving permanently..."; submitBtn.disabled = true; }

    try {
      const selectedOption = bankSelect.options[bankSelect.selectedIndex];
      const bankName = selectedOption.text;
      const bankCode = bankSelect.value; // nekpay code

      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        bankAccount: {
          bankName,
          bankCode,
          accountNumber: accNumInput.value.trim(),
          accountName: accountNameValue,
        }
      });

      window.showToast('Bank Account Saved Successfully!', 'success');
    } catch (err) {
      console.error("Save Error:", err);
      window.showToast('Failed to save. Check connection.', 'error');
      if (submitBtn) { submitBtn.innerText = originalBtnText; submitBtn.disabled = false; }
    }
  });
}

document.getElementById('homeNav').addEventListener('click', function (e) {
  e.preventDefault();
  showDashboard();
});

// Select elements
// We changed this from .withdraw-max to #withdrawMaxBtn
const maxBtn = document.getElementById('withdrawMaxBtn');
const balanceEl = document.getElementById('withdrawBalance');
const inputEl = document.getElementById('withdrawAmountInput');

// Add a safety check so it doesn't crash if the button is missing
if (maxBtn && balanceEl && inputEl) {
  maxBtn.addEventListener('click', () => {
    // Get balance text (e.g. "₦12,500")
    let balanceText = balanceEl.textContent;

    // Remove currency symbol and commas
    let cleanBalance = balanceText.replace(/[₦,]/g, '').trim();

    // Set it into input
    inputEl.value = cleanBalance;
  });
} else {
  console.log("Withdrawal elements not found on this page.");
}
// Elements
const dailyChip = document.getElementById('dailyChip');
const dailyLabel = document.getElementById('dailyLabel');


const dailyReward = 50;

async function loadBalance() {
  const user = auth.currentUser;
  if (!user) return;

  // We connect the variable to the ID in your HTML
  balanceAmount = document.getElementById('withdrawBalance');

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const data = userSnap.data();

  // Update the text only if the element was found
  if (balanceAmount) {
    balanceAmount.textContent = `₦${(data.balance || 0).toLocaleString()}`;
  }
}


document.addEventListener("DOMContentLoaded", () => {
  // 1. DOM Elements
  const rechargePage = document.getElementById("rechargePage");
  const bottomNav = document.getElementById("bottomNav");
  const dashboard = document.getElementById("dashboard");
  const rechargeTriggers = document.querySelectorAll('.qa-btn.recharge, #mainRechargeTrigger, .action-btn#depositBtn');
  const rechargeBackBtn = document.getElementById("rechargeBackBtn");

  // 2. OPEN RECHARGE PAGE
  rechargeTriggers.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!rechargePage) return;

      if (typeof showLoader === 'function') {
        showLoader({
          callback: () => {
            if (typeof pages !== 'undefined') {
              pages.forEach(p => { if (p) p.style.display = 'none'; });
            }
            if (dashboard) dashboard.style.display = 'none';
            if (bottomNav) bottomNav.style.display = 'none';
            rechargePage.style.display = 'block';
          }
        });
      } else {
        rechargePage.style.display = 'block';
      }
    });
  });

  // 3. BACK BUTTON
  if (rechargeBackBtn) {
    rechargeBackBtn.addEventListener('click', () => {
      rechargePage.style.display = 'none';
      if (dashboard) dashboard.style.display = 'block';
      if (bottomNav) bottomNav.style.display = 'flex';
    });
  }

  // 4. AMOUNT SELECTION & NEKPAY INTEGRATION
  if (!rechargePage) return;

  const amountOptions = rechargePage.querySelectorAll('.amount-option');
  const customInput = rechargePage.querySelector('#customAmount');
  const depositBtn = rechargePage.querySelector('#depositBtn');

  amountOptions.forEach(option => {
    option.addEventListener('click', function () {
      amountOptions.forEach(opt => opt.classList.remove('active'));
      this.classList.add('active');
      if (customInput) customInput.value = this.dataset.value;
    });
  });

  if (!depositBtn) return;

  depositBtn.innerText = "Proceed to Payment";

  // Shared alert style
  const alertStyle = {
    background: '#ffffff',
    color: '#1e3a5f',
    confirmButtonColor: '#3b82f6',
  };

  depositBtn.addEventListener('click', async () => {
    if (!customInput) return;

    const amount = Number(customInput.value);
    const user = auth?.currentUser;

    if (!user) {
      Swal.fire({
        ...alertStyle,
        icon: 'warning',
        title: 'Authentication Required',
        text: 'Please login to continue',
      });
      return;
    }

    if (!amount || amount < 1000) {
      Swal.fire({
        ...alertStyle,
        icon: 'warning',
        title: 'Minimum Recharge',
        text: 'Minimum recharge is ₦1,000',
      });
      return;
    }

    // Show loading
    Swal.fire({
      ...alertStyle,
      title: 'Processing Payment',
      text: 'Please wait while we prepare your secure checkout...',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      // CHECK: block if user has any active deposit in progress
      const activeQuery = await getDocs(
        query(
          collection(transactionDb, "deposits"),
          where("uid", "==", user.uid),
          where("status", "in", ["pending", "awaiting_payment", "processing"]),
          limit(1)
        )
      );

      if (!activeQuery.empty) {
        Swal.fire({
          ...alertStyle,
          icon: 'info',
          title: 'Deposit In Progress',
          text: 'You already have a deposit being processed. Please wait for it to complete before making another.',
        });
        return;
      }

      // Generate depositId without writing to Firestore
      const depositId = doc(collection(transactionDb, "deposits")).id;

      const res = await fetch("/.netlify/functions/createPayment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          depositId,
          userId: user.uid
        })
      });

      if (!res.ok) throw new Error("Server error. Please try again.");

      const data = await res.json();

      if (data.respCode === "SUCCESS" && data.payInfo) {
        Swal.update({
          title: 'Redirecting...',
          text: 'Taking you to the payment page now.'
        });
        window.location.href = data.payInfo;
      } else {
        throw new Error(data.tradeMsg || "Payment setup failed");
      }

    } catch (err) {
      console.error("Nekpay Process Failed:", err);
      Swal.fire({
        ...alertStyle,
        icon: 'error',
        title: 'Payment Error',
        text: err.message,
      });
    }
  });
});

const profilePage = document.getElementById('profilePage');


const bottomNavItems = document.querySelectorAll('.bottom-nav .nav-item');
// product page elements
const productPage = document.getElementById('productPage');
const productList = document.getElementById('productList');


// Add click event to all nav items
const pages = [
  document.getElementById('dashboard'),
  document.getElementById('profilePage'),
  document.getElementById('rechargePage'),
  document.getElementById('rechargeConfirmPage'), // include the recharge confirmation page
  document.getElementById('productPage'),
  document.getElementById('invitePage'), // <--- added here
  document.getElementById('teamPage'),
  document.getElementById('bankPage'),
  document.getElementById('withdrawPage'), // 👈 Add this
  document.getElementById("recordsPage"),
  document.getElementById("myInvestmentPage"),
  document.getElementById("earningsPage")
  // add other pages here if you create more
];


bottomNavItems.forEach(item => {
  item.addEventListener('click', function (e) {
    e.preventDefault();

    const text = item.textContent.trim().toLowerCase();

    let targetPage = null;
    if (text.includes('home')) targetPage = pages[0];
    if (text.includes('profile')) targetPage = pages[1];
    if (text.includes('reviews')) targetPage = pages[4]; // productPage
    if (text.includes('team')) targetPage = pages[6]; // View Team button fixes
    if (text.includes('invite')) targetPage = pages[5];
    if (text.includes('bank')) targetPage = pages[7];
    if (text.includes('withdraw')) targetPage = pages[8];
    if (text.includes('records')) targetPage = pages[9];
    if (text.includes('my investment')) targetPage = pages[10];
    if (text.includes('earnings')) targetPage = pages[11];

    if (!targetPage) return;

    const loader = document.getElementById('pageLoader');
    loader.style.display = 'flex';
    loader.style.opacity = '1';

    setTimeout(() => {
      pages.forEach(page => {
        if (page) page.style.display = 'none';
      });

      if (targetPage.id === 'invitePage') {
        targetPage.style.display = 'flex';
        targetPage.style.flexDirection = 'column';
      } else {
        targetPage.style.display = 'block';
      }
      // 🚀 ADD THIS LINE HERE:
      localStorage.setItem('lastPage', targetPage.id);

      loader.style.opacity = '0';
      setTimeout(() => loader.style.display = 'none', 500);
    }, 300);
  });
});



document.addEventListener("DOMContentLoaded", () => {
  const earningsPage = document.getElementById("earningsPage");       // Team page
  const earningsBackBtn = document.getElementById("earningsBackBtn"); // Back button inside team page
  const bottomNav = document.getElementById("bottomNav");             // Bottom nav
  const dashboard = document.getElementById("dashboard");             // Default page to return to

  const earningsBtn = document.getElementById("earningsBtn");         // Button to open team page
  if (earningsBtn) {
    earningsBtn.addEventListener("click", () => {
      // Hide all other pages safely
      if (pages && pages.length) {
        pages.forEach(p => {
          if (p) p.style.display = "none";
        });
      }

      // Show Team page
      if (earningsPage) earningsPage.style.display = "block";

      // Hide bottom nav
      if (bottomNav) bottomNav.style.display = "none";
    });
  }

  // Back button click → return to dashboard/home
  if (earningsBackBtn) {
    earningsBackBtn.addEventListener("click", () => {
      if (earningsPage) earningsPage.style.display = "none";
      if (dashboard) dashboard.style.display = "block";
      if (bottomNav) bottomNav.style.display = "flex";
    });
  }
});



document.addEventListener("DOMContentLoaded", () => {
  const bottomNav = document.getElementById("bottomNav");
  const withdrawPage = document.getElementById("withdrawPage");
  const dashboard = document.getElementById("dashboard");
  const withdrawBackBtn = document.getElementById("withdrawBackBtn");


  const withdrawBtns = document.querySelectorAll('.qa-btn.withdraw, #withdrawBtn');



  withdrawBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Hide all pages safely
      if (pages && pages.length) {
        pages.forEach(p => {
          if (p) p.style.display = 'none';
        });
      }

      if (withdrawPage) withdrawPage.style.display = 'block';
      if (bottomNav) bottomNav.style.display = 'none';

      // Load withdraw data
      if (typeof loadWithdrawData === "function") loadWithdrawData();
    });
  });


  // Back button click
  if (withdrawBackBtn) {
    withdrawBackBtn.addEventListener('click', () => {
      withdrawPage.style.display = 'none';
      dashboard.style.display = 'block';
      bottomNav.style.display = 'flex';
    });
  }
});



document.addEventListener("DOMContentLoaded", () => {
  const recordsPage = document.getElementById("recordsPage");
  const recordsBackBtn = document.getElementById("recordsBackBtn");
  const bottomNav = document.getElementById("bottomNav");
  const dashboard = document.getElementById("dashboard");

  const recordsBtn = document.getElementById("myRecordsBtn");
  if (recordsBtn) {
    recordsBtn.addEventListener("click", () => {
      // Hide all other pages safely
      if (pages && pages.length) {
        pages.forEach(p => {
          if (p) p.style.display = "none";
        });
      }

      // Show Records page
      if (recordsPage) recordsPage.style.display = "block";

      // Hide bottom nav
      if (bottomNav) bottomNav.style.display = "none";

      // Load records
      const container = document.getElementById("recordsContainer");
      if (container) loadRecords(container);
    });
  }


  // Back button click → return to profilePage
  if (recordsBackBtn) {
    recordsBackBtn.addEventListener("click", () => {
      // 1. Hide the records page
      recordsPage.style.display = "none";

      // 2. Show the profile page
      const profilePage = document.getElementById("profilePage");
      if (profilePage) {
        profilePage.style.display = "block";
      }

      // 3. Show bottom nav again
      bottomNav.style.display = "flex";
    });
  }
});


document.addEventListener("DOMContentLoaded", () => {
  const investmentPage = document.getElementById("myInvestmentPage");
  const investmentRecordsBtn = document.getElementById("investmentRecordsBtn");
  const bottomNav = document.getElementById("bottomNav");
  const dashboard = document.getElementById("dashboard");
  const investmentBackBtn = document.getElementById("investmentBackBtn");

  const MS_IN_DAY = 24 * 60 * 60 * 1000;
  let countdownIntervals = [];
  bottomNav.style.display = "flex";
  // ================= BACK BUTTON =================
  if (investmentBackBtn) {
    investmentBackBtn.addEventListener("click", () => {
      investmentPage.style.display = "none";
      dashboard.style.display = "block";
      bottomNav.style.display = "flex";

      // 🔒 clear countdown timers
      countdownIntervals.forEach(id => clearInterval(id));
      countdownIntervals = [];
    });
  }


  // ================= INVESTMENT RECORDS =================
  if (investmentRecordsBtn) {
    investmentRecordsBtn.addEventListener("click", async () => {
      // hide all pages safely
      if (typeof pages !== "undefined" && pages.length) {
        pages.forEach(p => {
          if (p) p.style.display = "none"; // ✅ safe assignment
        });
      }

      if (!investmentPage) return;

      investmentPage.style.display = "block";


      const container = document.querySelector(".premium-card");
      if (!container) return;

      const user = auth?.currentUser;
      if (!user) {
        window.showToast('Not Logged In: Please log in first!', 'error');
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        window.showToast('User Data Not Found: Please log in again!', 'error');
        return;
      }

      let investments = snap.data().investments || [];
      if (!Array.isArray(investments)) investments = Object.values(investments);

      container.innerHTML = "";




      if (investments.length === 0) {
        // Use your container ID (e.g., 'myInvestmentPage' or whichever holds your list)


        container.innerHTML = `
    <div class="lps-empty-state">
      <div class="lps-empty-icon-circle">
        <i class="fa-solid fa-bag-shopping"></i>
      </div>
      
      <h3 class="lps-empty-title">No products yet</h3>
      <p class="lps-empty-subtitle">It looks like you haven't purchased anything yet. Browse our shop to get started!</p>
      
      <button class="lps-explore-btn" onclick="document.getElementById('homeNav').click()">
        Explore Products
      </button>
    </div>
  `;
        return;
      }

      // 🔒 clear old countdowns before rendering again
      countdownIntervals.forEach(id => clearInterval(id));
      countdownIntervals = [];

      investments.forEach((inv, index) => {
        // ===== NORMALIZE DATA =====
        let purchaseTime = inv.purchaseTime;

        if (purchaseTime?.seconds) {
          purchaseTime = purchaseTime.seconds * 1000;
        } else {
          purchaseTime = Number(purchaseTime);
        }

        if (!purchaseTime || isNaN(purchaseTime)) {
          purchaseTime = Date.now();
        }

        const totalEarned = Number(inv.totalEarned) || 0;
        const daily = Number(inv.daily) || 0;
        const days = Number(inv.days) || 0;
        const price = Number(inv.price) || 0;
        const status = inv.status || "active";


        const card = document.createElement("div");

        card.className = "premium-card";

        const progress = ((inv.lastPaidDay || 0) / inv.days) * 100;
        const daysLeft = inv.days - (inv.lastPaidDay || 0);

        card.innerHTML = `
  <div class="header-main">
    <div class="plan-icon-box">
      <i class="fa-solid fa-building-columns"></i>
    </div>

    <div class="title-group">
      <h3 class="plan-title">${inv.name || 'Investment Plan'}</h3>
      <div class="plan-duration-subtitle">${inv.days || 0} days duration</div>
    </div>

    <div class="active-tag">
      <span style="color: #22c55e; font-size: 8px;">●</span> Active
    </div>
  </div>

  <div class="premium-invest-grid">
    <div class="invest-metric-card">
      <span class="stat-label">Daily</span>
      <span class="stat-value">₦${Number(inv.daily || 0).toLocaleString()}</span>
    </div>

    <div class="invest-metric-card">
      <span class="stat-label">Total</span>
      <span class="stat-value">₦${Number((inv.daily || 0) * (inv.days || 0)).toLocaleString()}</span>
    </div>

    <div class="invest-metric-card">
      <span class="stat-label">Investment</span>
      <span class="stat-value">₦${Number(inv.price || 0).toLocaleString()}</span>
    </div>
  </div>

  <div class="detail-item" style="display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 12px;">
    <span>Capital Return Guarantee</span>
    <span style="color: #16a34a; font-weight: 500;">100% Returned</span>
  </div>

  <div class="details-summary-footer">
    <div class="detail-date-item">
      <i class="fa-regular fa-calendar-check"></i>
      <span>Started: ${inv.dateStarted || '---'}</span>
    </div>
    
    <div class="countdown-live-tracker">
      <span style="color: #94a3b8; font-weight: 400; font-size: 11.5px; margin-right: 2px;">Next:</span>
      <span id="cd-${index}" style="font-family: monospace; font-weight: 600; color: #334155;">00:00:00</span>
    </div>
  </div>
`;

        container.appendChild(card);

        // ===== GET ELEMENTS SAFELY =====
        const cdEl = document.getElementById(`cd-${index}`);
        const earnedEl = document.getElementById(`earned-${index}`);

        // ===== SET EARNED ONCE (NO REWRITE LOOP) =====
        if (earnedEl) earnedEl.textContent = `₦${totalEarned.toLocaleString()}`;

        if (cdEl) {
          let intervalId; // <-- ADD THIS line before defining updateCountdown

          const updateCountdown = () => {
            const now = Date.now();
            const elapsedDays = Math.floor((now - purchaseTime) / MS_IN_DAY);

            if (elapsedDays >= days || status === "completed") {
              cdEl.textContent = "Ended";
              clearInterval(intervalId); // ✅ now safe
              return;
            }

            const nextPayoutTime = purchaseTime + (elapsedDays + 1) * MS_IN_DAY;
            const remaining = Math.max(0, nextPayoutTime - now);

            const h = Math.floor(remaining / 3600000);
            const m = Math.floor((remaining % 3600000) / 60000);
            const s = Math.floor((remaining % 60000) / 1000);

            cdEl.textContent = `${h}h ${m}m ${s}s`;
          };

          updateCountdown();
          intervalId = setInterval(updateCountdown, 1000); // assign after
          countdownIntervals.push(intervalId);
        }


      });
    });
  }
});



document.querySelectorAll('.amount-btn-item').forEach(button => {
  button.addEventListener('click', function () {
    // 1. Remove 'active' from all buttons
    document.querySelectorAll('.amount-btn-item').forEach(btn => btn.classList.remove('active'));

    // 2. Add 'active' to the clicked button
    this.classList.add('active');

    // 3. Extract the number (remove comma and "₦") and fill the input
    const rawValue = this.innerText.replace(/[^0-9]/g, '');
    document.getElementById('customAmount').value = rawValue;
  });
});



const FintechToast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: '#fff',
  color: '#111',
  customClass: {
    popup: 'fintech-toast'
  }
});

// ======================================================
// INVESTMENT PRODUCTS
// ======================================================
const products = [
  { name: "Snapdragon 1", price: 3000, daily: 500, days: 50 },
  { name: "Snapdragon 2", price: 6000, daily: 1000, days: 50 },
  { name: "Snapdragon 3", price: 10000, daily: 1500, days: 30 },
  { name: "Snapdragon 4", price: 20000, daily: 3000, days: 50 },
  { name: "Snapdragon 5", price: 30000, daily: 4500, days: 50 },
  { name: "Snapdragon 6", price: 50000, daily: 7500, days: 50 },
  { name: "Snapdragon 7", price: 100000, daily: 15000, days: 50 }



];

// ======================================================
// TIME CONFIG
// ======================================================

let investmentInterval = null;


// ======================================================
// HANDLE INVESTMENT (SAFE – NO DOUBLE CHARGE)
// ======================================================
async function handleInvestment(amount, daily, days) {
  const user = auth.currentUser;
  if (!user) {
    window.showToast('Not Logged In: Please log in first!', 'error');
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const balance = Number(data.balance) || 0;

  if (balance < amount) {
    window.showToast('Insufficient balance: Add funds to continue this transaction.', 'warning');

    // Switch pages after alert
    document.getElementById("dashboard").style.display = "none";
    document.getElementById("productPage").style.display = "none";
    document.getElementById("bottomNav").style.display = "none";
    document.getElementById("rechargePage").style.display = "block";

    return;
  }

  const investments = Array.isArray(data.investments) ? data.investments : [];

  investments.push({
    // ✅ ADD THIS: A unique ID for every single purchase
    purchaseId: "INV-" + Date.now() + "-" + Math.floor(Math.random() * 1000),

    name: products.find(p => p.price === amount)?.name || "Investment",
    price: amount,
    daily,
    days,
    purchaseTime: Date.now(),
    totalEarned: 0,
    lastPaidDay: 0,
    status: "active"
  });

  await updateDoc(userRef, {
    balance: increment(-amount),
    investments
  });

  const balEl = document.getElementById("user-balance");
  if (balEl) balEl.textContent = (balance - amount).toLocaleString();

  window.showToast('Investment Successful: Your investment has been processed.', 'success');

  showDashboard();
  startInvestmentSystem(user.uid);
}


// ======================================================
// SYNC EARNINGS (OPTIMIZED - 1 READ TOTAL)
// ======================================================
async function syncEarnings(userId) {
  // ✅ QUOTA SAVER: If a sync is already running, KILL this duplicate call immediately
  if (!userId || isSyncingNow) return;

  isSyncingNow = true; // Set the lock

  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      isSyncingNow = false;
      return;
    }

    const data = snap.data();
    const investments = Array.isArray(data.investments) ? data.investments : [];
    const now = Date.now();

    let totalEarningsToCredit = 0;
    let hasChanges = false;

    // Use a reference for history records
    const recRef = collection(db, "users", userId, "records");

    for (const inv of investments) {
      if (inv.status !== "active") continue;

      const daysSincePurchase = Math.floor((now - inv.purchaseTime) / MS_IN_DAY);
      const totalPayableDays = Math.min(daysSincePurchase, inv.days);
      const daysOwed = totalPayableDays - (inv.lastPaidDay || 0);

      if (daysOwed > 0) {
        // Calculate total for this specific plan
        const amountForThisPlan = daysOwed * inv.daily;

        inv.totalEarned = (inv.totalEarned || 0) + amountForThisPlan;
        inv.lastPaidDay = totalPayableDays;
        totalEarningsToCredit += amountForThisPlan;

        // ✅ QUOTA SAVER: Instead of 1 record per day, save 1 summary for all owed days
        await addDoc(recRef, {
          type: "Investment Profit",
          purchaseId: inv.purchaseId || "legacy",
          amount: amountForThisPlan,
          daysCredited: daysOwed,
          timestamp: serverTimestamp(),
          plan: inv.name,
          note: `Earnings for ${daysOwed} day(s)`
        });

        hasChanges = true;
      }

      if (inv.lastPaidDay >= inv.days) {
        inv.status = "completed";
        hasChanges = true;
      }
    }

    if (hasChanges) {
      // ✅ FINAL UPDATE: Credit balance in one go
      await updateDoc(userRef, {
        balance: increment(totalEarningsToCredit),
        investments: investments
      });
      console.log(`Success: Credited ₦${totalEarningsToCredit}`);
    }

    // Refresh UI
    if (typeof renderCountdowns === "function") renderCountdowns(investments);

    const balEl = document.getElementById("user-balance");
    if (balEl) {
      const currentBal = Number(data.balance) || 0;
      balEl.textContent = (currentBal + totalEarningsToCredit).toLocaleString();
    }

  } catch (error) {
    console.error("Sync Earnings Error:", error);
  } finally {
    isSyncingNow = false; // 🔓 Release the lock so it can run next time
  }
}

// ======================================================
// GLOBALS & CONFIG
// ======================================================
let userInvestmentsLocal = [];



// ======================================================
// 1. START SYSTEM (RUNS ONCE ON LOGIN)
// ======================================================
async function startInvestmentSystem(userId) {
  // Clear any existing interval to prevent multiple timers running
  if (investmentInterval) clearInterval(investmentInterval);

  // STEP A: Sync earnings ONCE (Uses 1 Read)
  // This calculates missed days automatically since the last time they logged in.
  await syncEarnings(userId);

  // STEP B: Fetch the updated data into memory to save further reads
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    userInvestmentsLocal = snap.data().investments || [];
  }

  // STEP C: START THE UI TIMER (0 Reads)
  // Updates every 1 second for a "Premium" feel without hitting Firebase.
  investmentInterval = setInterval(() => {
    renderCountdowns(userInvestmentsLocal);
  }, 1000);
}

// ======================================================
// 2. COUNTDOWN UI (0 DATABASE CALLS)
// ======================================================
function renderCountdowns(investments) {
  const now = Date.now();
  if (!investments || investments.length === 0) return;

  investments.forEach((inv, i) => {
    const cdEl = document.getElementById(`cd-${i}`);
    const earnedEl = document.getElementById(`earned-${i}`);
    if (!cdEl) return;

    if (earnedEl) earnedEl.textContent = (inv.totalEarned || 0).toLocaleString();

    if (inv.status === "completed") {
      cdEl.textContent = "Completed";
      return;
    }

    // Calculate time until next daily payout
    const daysSinceStart = Math.floor((now - inv.purchaseTime) / MS_IN_DAY);
    const nextPayoutTime = inv.purchaseTime + (daysSinceStart + 1) * MS_IN_DAY;
    const remaining = Math.max(0, nextPayoutTime - now);

    // ✅ FIXED MATH:
    // 1. Get total hours
    const h = Math.floor(remaining / (1000 * 60 * 60));
    // 2. Get total minutes LEFT OVER after hours are taken out
    const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    // 3. Get total seconds LEFT OVER after minutes are taken out
    const s = Math.floor((remaining % (1000 * 60)) / 1000);

    // ✅ Display correctly: e.g., 17h 45m 12s
    cdEl.textContent = `${h}h ${m}m ${s}s`;

    if (remaining <= 1000 && inv.status === "active") {
      setTimeout(() => location.reload(), 2000);
    }
  });
}
// ======================================================
// 3. AUTO-START (ON LOGIN)
// ======================================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    startInvestmentSystem(user.uid);
  } else {
    // Clear everything on logout
    if (investmentInterval) clearInterval(investmentInterval);
    userInvestmentsLocal = [];
  }
});


// ======================================================
// INVEST BUTTON HANDLER (FIXED)
// ======================================================
document.addEventListener("DOMContentLoaded", () => {
  const productContainer = document.querySelector(".dashboard .product-list");
  if (!productContainer) return;

  productContainer.addEventListener("click", (e) => {
    if (!e.target.classList.contains("invest-btn")) return;

    const card = e.target.closest(".product-card");
    if (!card) return;

    let price = 0;
    let daily = 0;
    let days = 0;

    // ================= PRICE + DAILY =================
    const infoRows = card.querySelectorAll(".info-row");

    infoRows.forEach(row => {
      const label = row.querySelector(".info-label")?.innerText.toLowerCase() || "";
      const value = row.querySelector(".info-value")?.innerText || "";

      if (label.includes("price")) {
        price = parseInt(value.replace(/[^0-9]/g, ""), 10) || 0;
      }

      if (label.includes("daily")) {
        daily = parseInt(value.replace(/[^0-9]/g, ""), 10) || 0;
      }
    });


    // ================= DURATION (FIXED) =================
    infoRows.forEach(row => {
      const label = row.querySelector(".info-label")?.innerText.toLowerCase() || "";
      const value = row.querySelector(".info-value")?.innerText || "";

      if (label.includes("period")) {
        days = parseInt(value.replace(/[^0-9]/g, ""), 10) || 0;
      }
    });


    // ================= DEBUG =================
    console.log("Investment values →", { price, daily, days });

    // ================= VALIDATION =================
    if (!price || !daily || !days) {
      alert("Error: Missing or invalid product data");
      return;
    }

    // ================= CALL =================
    showLoader({
      callback: () => handleInvestment(price, daily, days)
    });
  });
});

window.handleInvestment = handleInvestment;

document.addEventListener("DOMContentLoaded", () => {
  // 1. Setup selectors
  const welcomePopup = document.getElementById("welcomePopup");
  const closePopup = document.getElementById("closePopup");
  const bottomNav = document.getElementById("bottomNav");

  // 2. The close logic
  document.addEventListener("click", (event) => {
    if (event.target.closest("#closePopup")) {
      console.log("Button clicked! Closing SAMSUNG SNAPDRAGON modal...");

      if (welcomePopup) {
        // This removes the inline style AND ignores the CSS file rule
        welcomePopup.style.display = "none";
        welcomePopup.style.setProperty("display", "none", "important");
      }

      if (bottomNav) {
        bottomNav.classList.add("open");
      }
    }
  });
});

function openInvitePage() {
  // hide ALL pages first
  pages.forEach(page => {
    if (page) page.style.display = 'none';
  });

  // show invite page properly
  invitePage.style.display = 'flex';
  invitePage.style.flexDirection = 'column';

  // hide bottom nav if needed
  bottomNav.style.display = 'flex';

  // load referral data
  const user = auth.currentUser;
  if (user) setupReferral(user);
}

document.addEventListener('DOMContentLoaded', () => {
  const bottomNav = document.getElementById("bottomNav");
  const invitePage = document.getElementById("invitePage");
  const teamPage = document.getElementById("teamPage");
  const dashboard = document.getElementById("dashboard");
  const inviteBackBtn = document.getElementById("inviteBackBtn");
  const bottomNavItems = document.querySelectorAll(".nav-item");
  const viewTeamButtons = document.querySelectorAll(".team-btn");
  const refCardBtn = document.getElementById("refCard"); // Invite button

  // ------------------ Disable "View Team" buttons on Invite Page ------------------
  viewTeamButtons.forEach(btn => btn.disabled = true);

  // ------------------ Bottom Nav Clicks ------------------
  bottomNavItems.forEach(item => {
    item.addEventListener('click', function () {
      const text = item.textContent.trim().toLowerCase();

      // Hide all pages first
      [dashboard, invitePage, teamPage].forEach(p => {
        if (p) p.style.display = 'none';
      });

      if (text === "home") {
        dashboard.style.display = 'block';
        bottomNav.style.display = 'flex';
      }

      if (text.includes('invite')) {
        openInvitePage();
        return;
      }

      if (text === "team") {
        teamPage.style.display = 'block';
        invitePage.style.display = 'none';
        bottomNav.style.display = 'none';
        openTeam(1); // Load Level 1 by default
      }
    });
  });



  // ------------------ Invite Button (refCard) Click ------------------
  if (refCardBtn) {
    refCardBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openInvitePage();
    });
  }

  // ------------------ Share Button (shareBtn) Click ------------------
  const shareBtn = document.getElementById('shareBtn');

  if (shareBtn) {
    shareBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openInvitePage();
    });
  }

  const myTeamBtn = document.getElementById("myTeamBtn");

  if (myTeamBtn) {
    myTeamBtn.addEventListener("click", (e) => {
      e.preventDefault();

      // Hide all pages in the pages array
      pages.forEach(p => {
        if (p) p.style.display = "none";
      });

      // Hide bottom nav
      /*  if (bottomNav) bottomNav.style.display = "none";*/

      // Show the invite/referral page
      if (invitePage) {
        invitePage.style.display = "flex";
        invitePage.style.flexDirection = "column";
        invitePage.style.width = "100%";
      }

      // Setup referral
      const user = auth.currentUser;
      if (user) setupReferral(user);
    });
  }



  // ------------------ Invite Back Button ------------------
  if (inviteBackBtn) {
    inviteBackBtn.addEventListener('click', () => {
      invitePage.style.display = 'none';
      dashboard.style.display = 'block';
      bottomNav.style.display = 'flex';
    });
  }
});


function copyInviteLink() {
  const refInput = document.getElementById("refLink");
  if (!refInput) return;

  // Select and copy the value
  refInput.select();
  refInput.setSelectionRange(0, 99999); // for mobile

  // Use execCommand for compatibility
  document.execCommand("copy");

  window.showToast('Copied: Referral link copied to clipboard!', 'success');
}
window.copyInviteLink = copyInviteLink;

// ------------------ Copy Invite Code ------------------
function copyInviteCode() {
  const codeText = document.getElementById("inviteCode");
  if (!codeText) return;

  const temp = document.createElement("textarea");
  temp.value = codeText.textContent;
  document.body.appendChild(temp);
  temp.select();
  document.execCommand("copy");
  document.body.removeChild(temp);

  window.showToast('Invite code copied successfully!', 'success');
}
window.copyInviteCode = copyInviteCode;

// ------------------ Generate Referral ID ------------------
function generateReferralId() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";

  const part1 = Array.from({ length: 3 }, () =>
    letters[Math.floor(Math.random() * letters.length)]
  ).join("");

  const part2 = Array.from({ length: 3 }, () =>
    numbers[Math.floor(Math.random() * numbers.length)]
  ).join("");

  return part1 + part2;
}

// ------------------ Share Buttons ------------------
const referralLink = document.getElementById("refLink");

document.querySelectorAll('.share-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    // Use the value from the input field
    const link = referralLink ? referralLink.value : "";
    let url = "#";

    if (btn.classList.contains('facebook')) url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
    if (btn.classList.contains('twitter')) url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}`;
    if (btn.classList.contains('whatsapp')) url = `https://api.whatsapp.com/send?text=${encodeURIComponent(link)}`;
    if (btn.classList.contains('telegram')) url = `https://t.me/share/url?url=${encodeURIComponent(link)}`;

    if (url !== "#") {
      window.open(url, '_blank');
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  // Handle opening the Team Page
  document.getElementById("viewTeamBtn")?.addEventListener("click", () => {
    // 1. Show the Team Page (assuming you have a function or style change here)
    const teamPage = document.getElementById("teamPage"); // Use your actual ID
    if (teamPage) teamPage.style.display = "block";

    // 2. Set the Level 1 tab to active visually
    const l1Btn = document.getElementById("level1Btn");
    if (l1Btn) setActiveTab(l1Btn);

    // 3. Trigger the data load
    loadTeam(1);

    // 4. Hide nav
    const nav = document.getElementById("bottomNav");
    if (nav) nav.style.display = "none";
  });
});


// ======================================================
// AUTO CLAIM COMMISSION (DYNAMIC & DUAL-DB OPTIMIZED)
// ======================================================



async function startAutoClaim() {
  if (autoClaimStarted) return;
  autoClaimStarted = true;

  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, "users", user.uid);

  // 1️⃣ Listen to the User Document (Main DB)
  onSnapshot(userRef, async (snap) => {
    if (!snap.exists()) return;

    // 2️⃣ Fetch Dynamic Rates from Admin Panel (Main DB)
    const ratesSnap = await getDoc(doc(db, "adminSettings", "rates"));
    const globalRates = ratesSnap.exists()
      ? ratesSnap.data()
      : { level1: 0.25, level2: 0.02 }; // Professional default fallback

    const uData = snap.data();

    // We keep 'trackedInvestments' in Main DB to prevent duplicate payout loops
    const claimed = Array.isArray(uData.trackedInvestments) ? uData.trackedInvestments : [];

    let newClaimed = [...claimed];
    let balanceIncrease = 0;
    let recordsToSave = [];

    // Referrals lists are currently in Main DB
    const referrals = [
      ...(uData.referrals?.level1 || []).map(r => ({ uid: r.uid, level: 1 })),
      ...(uData.referrals?.level2 || []).map(r => ({ uid: r.uid, level: 2 }))
    ];

    // 3️⃣ Loop through each referral to check for new investments
    for (const ref of referrals) {
      const refRef = doc(db, "users", ref.uid);
      const refSnap = await getDoc(refRef);

      if (!refSnap.exists()) continue;

      const refData = refSnap.data();
      if (!Array.isArray(refData.investments)) continue;

      const rate = ref.level === 1 ? globalRates.level1 : globalRates.level2;

      for (const inv of refData.investments) {
        if (!inv.purchaseTime || !inv.price) continue;

        // Unique ID prevents paying the same commission twice
        const uniqueId = `${inv.purchaseTime}-${ref.uid}-L${ref.level}`;
        if (newClaimed.includes(uniqueId)) continue;

        const commission = Number(inv.price) * rate;
        if (commission <= 0) continue;

        newClaimed.push(uniqueId);
        balanceIncrease += commission;

        // Prepare record for Heavy Load DB
        recordsToSave.push({
          id: uniqueId,
          data: {
            uid: user.uid, // Owner of the commission
            type: "Commission",
            amount: commission,
            level: ref.level,
            refUid: ref.uid,
            refNumber: refData.number || "User",
            status: "success", // For the records page logic
            timestamp: serverTimestamp(), // Use Firestore server time
            description: `Level ${ref.level} commission from ${refData.number || 'referral'}`
          }
        });
      }
    }

    // 4️⃣ Atomic Update: Save logs to Heavy Load and update Balance in Main
    if (balanceIncrease > 0) {
      try {
        // A. Save logs to transactionDb (Heavy Load)
        const batchPromises = recordsToSave.map(rec =>
          setDoc(doc(transactionDb, "records", rec.id), rec.data)
        );
        await Promise.all(batchPromises);

        // B. Update Money and Tracker in db (Main DB)
        await updateDoc(userRef, {
          balance: increment(balanceIncrease),
          totalCommission: increment(balanceIncrease),
          trackedInvestments: newClaimed
        });

        console.log(`✅ Success: Claimed ₦${balanceIncrease} in commissions.`);
      } catch (err) {
        console.error("❌ Commission Payout Error:", err);
      }
    }
  });
}

// 🛡️ AUTH WATCHER: Ensures the system starts when the user logs in
auth.onAuthStateChanged(user => {
  if (user) {
    console.log("Auto-Claim System: INITIALIZING...");
    startAutoClaim();
  } else {
    autoClaimStarted = false;
  }
});



// Global memory cache
let cachedUserData = null;
let cachedGlobalRates = null;

// ======================================================
// UI TOGGLE
// ======================================================
function showLevelDetails(level) {
  const detailView = document.getElementById("detailView");
  detailView.style.display = "block";
  document.getElementById("listTitle").textContent = `Team Members - Level ${level}`;
  loadTeam(level);
  detailView.scrollIntoView({ behavior: 'smooth' });
}

function closeDetails() {
  document.getElementById("detailView").style.display = "none";
  document.getElementById("teamList").innerHTML = "";
}

// ======================================================
// LOAD SUMMARY (Cleaned)
// ======================================================
async function loadSummary() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const [ratesSnap, userSnap] = await Promise.all([
      getDoc(doc(db, "adminSettings", "rates")),
      getDoc(doc(db, "users", user.uid))
    ]);

    cachedGlobalRates = ratesSnap.exists() ? ratesSnap.data() : { level1: 0.23, level2: 0.03 };
    if (!userSnap.exists()) return;
    cachedUserData = userSnap.data();

    // Loop through levels 1 and 2
    for (const level of [1, 2]) {
      const referrals = level === 1 ? (cachedUserData.referrals?.level1 || []) : (cachedUserData.referrals?.level2 || []);
      const commRate = level === 1 ? cachedGlobalRates.level1 : cachedGlobalRates.level2;
      let totalInvest = 0;

      if (referrals.length > 0) {
        const snapResults = await Promise.all(referrals.map(ref => getDoc(doc(db, "users", ref.uid))));
        snapResults.forEach(refSnap => {
          if (refSnap.exists()) {
            (refSnap.data().investments || []).forEach(inv => { totalInvest += Number(inv.price || 0); });
          }
        });
      }

      const totalComm = totalInvest * commRate;

      // Update IDs to match the simplified HTML
      document.getElementById(`t${level}Count`).textContent = referrals.length;
      document.getElementById(`t${level}Comm`).textContent = `₦${totalComm.toLocaleString()}`;
    }

  } catch (err) {
    console.error("Summary Load Error:", err);
  }
}

// ======================================================
// LOAD TEAM LIST
// ======================================================
async function loadTeam(level) {
  const teamListEl = document.getElementById("teamList");
  teamListEl.innerHTML = `<p style="text-align:center; padding:20px;">Loading...</p>`;

  try {
    const referrals = level === 1 ? (cachedUserData.referrals?.level1 || []) : (cachedUserData.referrals?.level2 || []);

    if (referrals.length === 0) {
      teamListEl.innerHTML = `<p style="text-align:center; padding:20px; font-size:13px; color:#64748b;">No members yet.</p>`;
      return;
    }

    const snapResults = await Promise.all(referrals.map(ref => getDoc(doc(db, "users", ref.uid))));
    teamListEl.innerHTML = "";

    snapResults.forEach((refSnap) => {
      if (!refSnap.exists()) return;
      const d = refSnap.data();
      let totalInv = 0;
      (d.investments || []).forEach(inv => { totalInv += Number(inv.price || 0); });

      const row = document.createElement("div");
      row.style.cssText = "background:white; padding:15px; border-radius:12px; margin-bottom:10px; border:1px solid #e2e8f0;";
      row.innerHTML = `
        <div style="font-weight:700; font-size: 14px; margin-bottom: 10px;">User: ${d.number?.slice(0, 4) + "****"}</div>
        <div class="stats-grid-override-layout">
            <div><div class="stat-inner-value-string">₦${totalInv.toLocaleString()}</div><div class="stat-inner-label-string">Investment</div></div>
            <div><div class="stat-inner-value-string">Tier ${level}</div><div class="stat-inner-label-string">Status</div></div>
        </div>
      `;
      teamListEl.appendChild(row);
    });
  } catch (err) {
    teamListEl.innerHTML = `<p style="text-align:center; color:red;">Error loading list.</p>`;
  }
}

auth.onAuthStateChanged((user) => { if (user) loadSummary(); });
window.showLevelDetails = showLevelDetails;
window.closeDetails = closeDetails;

// Initialize Firestore and Auth (assuming you already did this)
// const db = getFirestore(app);
// const auth = getAuth(app);

// Run only when user is logged in
onAuthStateChanged(auth, (user) => {
  if (!user) return; // not logged in, skip

  // Single reference to admin settings
  const settingsRef = doc(db, "adminSettings", "settings");

  // Real-time listener
  onSnapshot(settingsRef, (snapshot) => {
    if (!snapshot.exists()) return;
    const data = snapshot.data();

    // Telegram group button
    const tgBtn = document.querySelector(".join-tg-btn");
    if (tgBtn && data.officialGroup) {
      tgBtn.href = data.officialGroup;
    }

    // Customer service username
    const csBtn = document.getElementById("customerServiceBtn");
    if (csBtn && data.customerService) {
      csBtn.onclick = () => {
        const username = data.customerService.replace("@", "");
        window.open(`https://t.me/${username}`, "_blank");
      };
    }

    // Official group button click
    const officialDiv = document.querySelector(".official-group-link");
    if (officialDiv) {
      officialDiv.onclick = (e) => {
        e.stopPropagation(); // Prevent this click from triggering parent click listeners
        if (data?.officialGroup) {
          window.open(data.officialGroup, "_blank");
        } else {
          Toast.fire({
            icon: 'error',
            title: 'Link Unavailable',
            text: 'Official group link not available.',
            confirmButtonColor: '#007bff'
          });
        }
      };
    }

    // --- Bank info section removed because it's not needed anymore ---
    // const bank = data.bankAccount;
    // if (bank) { ... }

  }); // End onSnapshot
}); // End onAuthStateChanged



async function loadWithdrawData() {
  if (!auth.currentUser) return;

  try {
    // 1️⃣ Fetch withdrawal settings from MAIN DB (cached)
    if (!window._cachedSettings) {
      const settingsRef = doc(db, "adminSettings", "settings");
      const settingsSnap = await getDoc(settingsRef);
      window._cachedSettings = settingsSnap.exists() ? settingsSnap.data() : {};
    }

    const settings = window._cachedSettings;
    window.MIN_WITHDRAWAL = settings.minimumWithdrawal || 600;

    // 2️⃣ Load user balance and bank info from MAIN DB
    const userRef = doc(db, "users", auth.currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const data = userSnap.data();
    document.getElementById("withdrawBalance").textContent = "₦" + (data.balance || 0).toLocaleString();

    const bank = data.bankAccount;
    const bankCard = document.getElementById("withdrawBankCard");

    if (bank) {
      const bankDropdown = document.getElementById('bankName');
      let bankLetters = bank.bankName;
      if (bankDropdown) {
        const matchingOption = Array.from(bankDropdown.options).find(opt => opt.value === bank.bankName);
        if (matchingOption) bankLetters = matchingOption.text;
      }
      bankCard.innerHTML = `
        <p id="withdrawBankName">Bank: ${bankLetters}</p>
        <p id="withdrawAccountName">Name: ${bank.accountName}</p>
        <p id="withdrawAccountNumber">Acct No: ${bank.accountNumber.slice(0, 4)} **** ${bank.accountNumber.slice(-4)}</p>
      `;
    } else {
      bankCard.innerHTML = `
        <div class="bank-empty">
          <div class="bank-icon">🏦</div>
          <h4>No Bank Account Linked</h4>
          <p>You need to add a bank account before you can withdraw funds.</p>
          <button id="addAccountBtn">Add Bank Account</button>
        </div>
      `;
    }
  } catch (error) {
    console.error("Error loading withdrawal layout details:", error);
  }
}

document.getElementById("withdrawSubmitBtn").onclick = async () => {
  const amountInput = document.getElementById("withdrawAmountInput");
  const submitBtn = document.getElementById("withdrawSubmitBtn");
  if (!auth.currentUser) return;

  try {
    // 1️⃣ Fetch fresh user data
    const userRef = doc(db, "users", auth.currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      window.showToast('Error: User data not found!', 'error');
      return;
    }

    const userData = userSnap.data();
    const bank = userData.bankAccount;

    // 2️⃣ Validate bank account
    if (!bank || !bank.accountNumber || !bank.bankName || !bank.accountName) {
      window.showToast('Bank Account Required: Please bind your bank account first!', 'warning');
      return;
    }

    // 3️⃣ Validate active investment
    const investments = Array.isArray(userData.investments) ? userData.investments : [];
    const hasActiveInvestment = investments.some(inv => inv.status === "active");
    if (!hasActiveInvestment) {
      window.showToast('No Active Investment: You must have at least one active investment to withdraw.', 'warning');
      return;
    }

    // 4️⃣ Check withdrawal settings
    const settings = window._cachedSettings || {};
    if (settings.withdrawalEnabled === false) {
      window.showToast('Withdrawals Disabled: Withdrawals are currently disabled.', 'warning');
      return;
    }

    if (userData.withdrawalLocked) {
      window.showToast('Restricted: Your account is restricted from withdrawal.', 'error');
      return;
    }

    // 5️⃣ Validate amount
    const amount = parseFloat(amountInput.value);
    const minWithdrawal = settings.minimumWithdrawal || 1000;
    const currentBalance = userData.balance || 0;

    if (!amount || amount <= 0) {
      window.showToast('Invalid Amount: Enter a valid amount!', 'warning');
      return;
    }
    if (amount < minWithdrawal) {
      window.showToast(`Amount Too Low: Minimum is ₦${minWithdrawal.toLocaleString()}`, 'warning');
      return;
    }
    if (amount > currentBalance) {
      window.showToast('Insufficient Balance: You do not have enough funds!', 'error');
      return;
    }

    // 6️⃣ Check for existing pending withdrawal
    if (userData.hasPendingWithdrawal === true) {
      window.showToast('Pending Request: You already have a pending withdrawal.', 'warning');
      return;
    }

    // 7️⃣ Fetch fee settings
    const feeSnap = await getDoc(doc(db, "adminSettings", "withdrawal"));
    const feeData = feeSnap.exists() ? feeSnap.data() : {};
    const feeRate = feeData.fee ?? 0.15;
    const fee = amount * feeRate;
    const finalAmount = amount - fee;

    if (finalAmount < 510) {
      window.showToast('Amount Too Low: Minimum payout after fees must be at least ₦510.', 'warning');
      return;
    }

    // 8️⃣ Disable button
    submitBtn.innerText = "Processing...";
    submitBtn.disabled = true;

    // 9️⃣ Atomic balance deduction in MAIN DB
    await runTransaction(db, async (transaction) => {
      const freshUserSnap = await transaction.get(userRef);
      const freshBalance = freshUserSnap.data().balance || 0;
      if (amount > freshBalance) throw new Error("Insufficient balance!");
      transaction.update(userRef, {
        balance: freshBalance - amount,
        hasPendingWithdrawal: true
      });
    });

    // 🔟 Generate withdrawal ID
    const withdrawId = "W" + Date.now();

    // 1️⃣1️⃣ Save to coreNextDb (verified-withdrawal) as processing
    await setDoc(doc(coreNextDb, "withdrawals", withdrawId), {
      uid: auth.currentUser.uid,
      number: userData.number || "N/A",
      role: userData.role || "user",
      mchTransferId: withdrawId,
      originalAmount: amount,
      fee: fee,
      finalAmount: finalAmount,
      status: "processing",
      bankName: bank.bankName,
      bankCode: bank.bankCode || bank.bankName,
      accountNumber: bank.accountNumber,
      accountName: bank.accountName,
      createdAt: serverTimestamp()
    });

    // 1️⃣2️⃣ Call backend gateway
    const res = await fetch("/.netlify/functions/create-withdrawal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        withdrawId,
        uid: auth.currentUser.uid,
        amount,
        finalAmount,
        fee,
        bankCode: bank.bankCode || bank.bankName,
        accountNumber: bank.accountNumber,
        accountName: bank.accountName,
        bankName: bank.bankName,
        username: userData.fullName || userData.username || "User",
        phoneNumber: userData.number || "N/A",
        role: userData.role || "user",
      })
    });

    if (!res.ok) throw new Error("Server error. Please try again.");

    const data = await res.json();

    if (data.respCode === "SUCCESS") {
      // Update status to awaiting confirmation
      await setDoc(doc(coreNextDb, "withdrawals", withdrawId), {
        status: "awaiting_confirmation",
        gatewayTradeNo: data.tradeNo ?? null,
        updatedAt: serverTimestamp()
      }, { merge: true });

      window.showToast('Submitted: Withdrawal is being processed to your bank.', 'success');
      document.getElementById("withdrawBalance").textContent = "₦" + (currentBalance - amount).toLocaleString();
      amountInput.value = "";

    } else {
      // Gateway rejected — refund balance and reset flag
      await runTransaction(db, async (transaction) => {
        const freshUserSnap = await transaction.get(userRef);
        const freshBalance = freshUserSnap.data().balance || 0;
        transaction.update(userRef, {
          balance: freshBalance + amount,
          hasPendingWithdrawal: false
        });
      });

      // Update withdrawal status to failed
      await setDoc(doc(coreNextDb, "withdrawals", withdrawId), {
        status: "failed",
        failReason: data.errorMsg || "Gateway rejected the request",
        updatedAt: serverTimestamp()
      }, { merge: true });

      window.showToast(`Failed: ${data.errorMsg || "Gateway rejected the request. Balance refunded."}`, 'error');
    }

  } catch (err) {
    console.error("Withdrawal Error:", err);

    // Refund balance on unexpected error
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await runTransaction(db, async (transaction) => {
        const freshUserSnap = await transaction.get(userRef);
        const freshBalance = freshUserSnap.data().balance || 0;
        transaction.update(userRef, {
          balance: freshBalance + parseFloat(amountInput.value || 0),
          hasPendingWithdrawal: false
        });
      });
    } catch (refundErr) {
      console.error("Refund Error:", refundErr);
    }

    window.showToast(`Error: ${err.message || "Submission failed. Please try again."}`, 'error');

  } finally {
    submitBtn.innerText = "Withdraw Funds";
    submitBtn.disabled = false;
  }
};



const recordsPage = document.getElementById("recordsPage");

if (recordsPage) {
  const filterBtns = recordsPage.querySelectorAll(".filter-btn");

  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {

      // active state only inside records page
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const type = btn.dataset.type.toLowerCase();

      const cards = recordsPage.querySelectorAll(".record-card");

      cards.forEach(card => {
        const text = card.querySelector(".record-transaction")?.innerText.toLowerCase() || "";

        if (type === "all") {
          card.style.display = "flex";
        } else {
          card.style.display = text.includes(type) ? "flex" : "none";
        }
      });

    });
  });
}


// Helper to match the icon and style
function getIconConfig(type = "") {
  const t = type.toLowerCase();
  if (t.includes("withdrawal")) {
    return { icon: "fa-arrow-down", class: "icon-withdrawal" };
  }
  return { icon: "fa-wallet", class: "icon-deposit" };
}

// Helper for date formatting matching layout profile style: "28/05/2026"
function formatRecordDate(date) {
  if (!date) return "-";
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}


async function loadRecords(container) {
  if (!container) return;
  container.innerHTML = "";

  const user = auth.currentUser;
  if (!user) return;

  // Track real transaction length counter to increment metric value panel dynamically
  let globalTrxCounter = 1;
  const totalTrxCountEl = document.getElementById("totalTrxCount");

  // 1. Registration Bonus (Static Hard-coded Card)
  container.insertAdjacentHTML(
    "beforeend",
    `
    <div class="record-card" id="welcome-bonus-card">
      <div class="card-top-row">
        <span class="record-amount-label">Amount</span>
        <span class="record-date-wrapper" style="font-size:11.5px;color:#94a3b8;">Total Transactions</span>
      </div>
      <div class="card-mid-row">
        <span class="record-amount-value">₦600.00</span>
        <span class="record-status-pill">Welcome Bonus</span>
      </div>
      <div class="card-mid-row" style="margin-top: -2px;">
        <span class="record-date-wrapper">
          <i class="fa-regular fa-calendar"></i> 28/05/2026
        </span>
      </div>
      <div class="card-bottom-row">
        Welcome Bonus
      </div>
    </div>
    `
  );

  const collections = [
    { name: "withdrawals", label: "Withdrawal", database: coreNextDb },
    { name: "deposits", label: "Deposit", database: transactionDb },
    { name: "records", label: "Commission", database: transactionDb }
  ];

  collections.forEach(({ name, label, database }) => {
    let colRef;

    if (name === "records") {
      colRef = collection(db, "users", user.uid, "records");
    } else {
      colRef = query(collection(database, name), where("uid", "==", user.uid));
    }

    onSnapshot(colRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type !== "added") return;

        const rowId = `${name}-${change.doc.id}`;
        if (document.getElementById(rowId)) return;

        const data = change.doc.data();

        globalTrxCounter++;
        if (totalTrxCountEl) {
          totalTrxCountEl.textContent = globalTrxCounter;
        }

        // ---------------- STATUS & LABEL LOGIC ----------------
        let statusText = "Pending";
        let statusCustomClass = "status-pending-amber";
        let displayLabel = label;
        let subtitle = data.description || "Transaction";

        const s = data.status?.toLowerCase();
        if (s === "success" || s === "approved") {
          statusText = "Confirmed";
          statusCustomClass = "status-confirmed-green";
        } else if (s === "failed" || s === "declined") {
          statusText = "Failed";
          statusCustomClass = "status-failed-red";
        }

        // Transaction Type Specific Logic
        if (name === "withdrawals") {
          displayLabel = "Withdrawal";
          subtitle = `Ref: ${data.mchTransferId || "N/A"}`;
        } else if (name === "deposits") {
          displayLabel = "Deposit";
          subtitle = `Ref: ${data.orderNo || "N/A"}`;
        } else if (name === "records") {
          if (data.type === "Admin Update") {
            displayLabel = "Manual Credit";
            subtitle = "Added by Admin";
          } else {
            displayLabel = "Commission";
            subtitle = "System Reward";
          }
          statusText = "Confirmed";
          statusCustomClass = "status-confirmed-green";
        }

        // ---------------- DATE FORMAT PROCESSING ----------------
        let dateObj = data.approvedAt || data.createdAt || data.timestamp;
        if (dateObj?.toDate) dateObj = dateObj.toDate();
        else if (dateObj) dateObj = new Date(dateObj);

        const formattedDate = formatRecordDate(dateObj);

        // ---------------- AMOUNT CALCULATION ----------------
        const amount = (name === "withdrawals")
          ? (data.originalAmount ?? data.amount ?? 0)
          : (data.amount ?? 0);

        const formattedAmountText = `₦${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        // ---------------- RENDER ----------------
        const html = `
          <div class="record-card" id="${rowId}">
            <div class="card-top-row">
              <span class="record-amount-label">Amount</span>
              <span class="record-amount-label" style="font-size:11.5px;">Type</span>
            </div>
            <div class="card-mid-row">
              <span class="record-amount-value">${formattedAmountText}</span>
              <span class="record-status-pill ${statusCustomClass}">${statusText}</span>
            </div>
            <div class="card-mid-row" style="margin-top: -2px;">
              <span class="record-date-wrapper">
                <i class="fa-regular fa-calendar"></i> ${formattedDate}
              </span>
              <span style="font-size:12px; font-weight:500; color:var(--brand-primary-blue);">${displayLabel}</span>
            </div>
            <div class="card-bottom-row">
              ${subtitle}
            </div>
          </div>
        `;

        container.insertAdjacentHTML("afterbegin", html);
      });
    });
  });
}

document.querySelector(".settings-item")?.addEventListener("click", () => {
  // Hide all pages safely
  if (pages && pages.length) {
    pages.forEach(p => {
      if (p) p.style.display = "none";
    });
  }

  const recordsPage = document.getElementById("recordsPage");
  if (recordsPage) recordsPage.style.display = "block";

  const container = document.getElementById("recordsContainer");
  if (!container) return;

  loadRecords(container);
});




const withdrawalBtn = document.getElementById("withdrawalBtn");

withdrawalBtn?.addEventListener("click", () => {
  // Hide all pages safely
  if (pages && pages.length) {
    pages.forEach(p => {
      if (p) p.style.display = "none";
    });
  }

  // Hide navbar safely
  const navbar = document.getElementById("bottomNav");
  if (navbar) navbar.style.display = "none";

  // Show records page safely
  const recordsPage = document.getElementById("recordsPage");
  if (recordsPage) recordsPage.style.display = "block";

  // Load withdrawal records
  const container = document.getElementById("recordsContainer");
  if (!container) return;

  loadWithdrawalRecords(container);
});


async function loadWithdrawalRecords(container) {
  if (!container) return;
  container.innerHTML = "";

  const user = auth.currentUser;
  if (!user) return;

  let withdrawalCounter = 0;
  const totalTrxCountEl = document.getElementById("totalTrxCount");

  const colRef = query(
    collection(coreNextDb, "withdrawals"),
    where("uid", "==", user.uid)
  );

  onSnapshot(colRef, snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type !== "added") return;

      const rowId = `withdrawals-${change.doc.id}`;
      if (document.getElementById(rowId)) return;

      const data = change.doc.data();

      withdrawalCounter++;
      if (totalTrxCountEl) {
        totalTrxCountEl.textContent = withdrawalCounter;
      }

      // Status Logic
      let statusText = "Pending";
      let statusCustomClass = "";
      const s = data.status?.toLowerCase();
      if (s === "success" || s === "approved") {
        statusText = "Confirmed";
        statusCustomClass = "status-confirmed-green";
      } else if (s === "failed" || s === "declined") {
        statusText = "Failed";
        statusCustomClass = "status-failed-red";
      } else if (s === "processing") {
        statusText = "Processing";
      }

      // Time Formatting
      let time = data.approvedAt || data.createdAt || data.timestamp;
      if (time?.toDate) time = time.toDate();
      else if (time) time = new Date(time);
      const formattedDate = time ?
        String(time.getDate()).padStart(2, '0') + "/" +
        String(time.getMonth() + 1).padStart(2, '0') + "/" +
        time.getFullYear()
        : "-";

      // Data Attributes
      const amount = data.amount ?? data.originalAmount ?? 0;

      // TRACKING ID LOGIC: Showing mchTransferId
      const refNumber = data.mchTransferId || "N/A";
      const subtitle = `Ref: ${refNumber} | ${data.description || "Bank Transfer Withdrawal"}`;

      container.insertAdjacentHTML(
        "afterbegin",
        `
        <div class="record-card" id="${rowId}">
          <div class="card-top-row">
            <span class="record-amount-label">Amount</span>
            <span class="record-amount-label" style="font-size: 11.5px;">Type</span>
          </div>

          <div class="card-mid-row">
            <span class="record-amount-value" style="color: #ea580c;">
              -₦${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span class="record-status-pill ${statusCustomClass}">${statusText}</span>
          </div>

          <div class="card-mid-row" style="margin-top: -2px;">
            <span class="record-date-wrapper">
              <i class="fa-regular fa-calendar"></i> ${formattedDate}
            </span>
            <span style="font-size: 12px; font-weight: 500; color: var(--brand-primary-blue);">Withdrawal</span>
          </div>

          <div class="card-bottom-row" style="font-family: monospace; font-size: 11px; color: #64748b;">
            ${subtitle}
          </div>
        </div>
        `
      );
    });
  });
}


const depositBtn = document.getElementById("depositBtnrec");

depositBtn?.addEventListener("click", () => {
  // Hide all pages safely
  if (pages && pages.length) {
    pages.forEach(p => {
      if (p) p.style.display = "none";
    });
  }

  // Hide navbar safely
  const navbar = document.getElementById("bottomNav");
  if (navbar) navbar.style.display = "none";

  // Show records page safely
  const recordsPage = document.getElementById("recordsPage");
  if (recordsPage) recordsPage.style.display = "block";

  // Load deposit records
  const container = document.getElementById("recordsContainer");
  if (!container) return;

  loadDepositRecords(container); // Only deposits
});


async function loadDepositRecords(container) {
  if (!container) return;
  container.innerHTML = "";

  const user = auth.currentUser;
  if (!user) return;

  let depositCounter = 0;
  const totalTrxCountEl = document.getElementById("totalTrxCount");

  const colRef = query(
    collection(transactionDb, "deposits"),
    where("uid", "==", user.uid)
  );

  onSnapshot(colRef, snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type !== "added") return;

      const rowId = `deposits-${change.doc.id}`;
      if (document.getElementById(rowId)) return;

      const data = change.doc.data();

      depositCounter++;
      if (totalTrxCountEl) {
        totalTrxCountEl.textContent = depositCounter;
      }

      // Status Logic
      let statusText = "Pending";
      let statusCustomClass = "";
      const s = data.status?.toLowerCase();
      if (s === "success" || s === "approved") {
        statusText = "Confirmed";
        statusCustomClass = "status-confirmed-green";
      } else if (s === "failed" || s === "declined") {
        statusText = "Failed";
        statusCustomClass = "status-failed-red";
      } else if (s === "processing") {
        statusText = "Processing";
      }

      // Time Formatting
      let time = data.createdAt || data.timestamp;
      if (time?.toDate) time = time.toDate();
      else if (time) time = new Date(time);
      const formattedDate = time ?
        String(time.getDate()).padStart(2, '0') + "/" +
        String(time.getMonth() + 1).padStart(2, '0') + "/" +
        time.getFullYear()
        : "-";

      // Data Attributes
      const amount = data.amount ?? data.originalAmount ?? 0;

      // TRACKING ID LOGIC: Showing orderNo
      const refNumber = data.orderNo || "N/A";
      const subtitle = `Ref: ${refNumber} | ${data.description || "Account Balance Funding"}`;

      container.insertAdjacentHTML(
        "afterbegin",
        `
        <div class="record-card" id="${rowId}">
          <div class="card-top-row">
            <span class="record-amount-label">Amount</span>
            <span class="record-amount-label" style="font-size: 11.5px;">Type</span>
          </div>

          <div class="card-mid-row">
            <span class="record-amount-value" style="color: #16a34a;">
              +₦${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span class="record-status-pill ${statusCustomClass}">${statusText}</span>
          </div>

          <div class="card-mid-row" style="margin-top: -2px;">
            <span class="record-date-wrapper">
              <i class="fa-regular fa-calendar"></i> ${formattedDate}
            </span>
            <span style="font-size: 12px; font-weight: 500; color: var(--brand-primary-blue);">Deposit</span>
          </div>

          <div class="card-bottom-row" style="font-family: monospace; font-size: 11px; color: #64748b;">
            ${subtitle}
          </div>
        </div>
        `
      );
    });
  });
}

const incomeBtn = document.getElementById("incomeBtn");

incomeBtn?.addEventListener("click", () => {
  // Hide all pages safely
  if (pages && pages.length) {
    pages.forEach(p => {
      if (p) p.style.display = "none";
    });
  }

  // Hide navbar safely
  const navbar = document.getElementById("bottomNav");
  /* if (navbar) navbar.style.display = "none";*/

  // Show records page safely
  const recordsPage = document.getElementById("recordsPage");
  if (recordsPage) recordsPage.style.display = "block";

  // Load income records
  const container = document.getElementById("recordsContainer");
  if (!container) return;

  loadIncomeRecords(container); // Only investment profit
});

async function loadIncomeRecords(container) {
  if (!container) return;
  container.innerHTML = ""; // clear previous records

  const user = auth.currentUser;
  if (!user) return;

  // Initialize card count tracker to dynamically update the Total Transactions panel
  let incomeCounter = 0;
  const totalTrxCountEl = document.getElementById("totalTrxCount");

  // ---------------- GET INVESTMENT PROFIT RECORDS ----------------
  const colRef = query(
    collection(db, "users", user.uid, "records"),
    where("type", "==", "Investment Profit")
  );

  onSnapshot(colRef, snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type !== "added") return;

      const rowId = `income-${change.doc.id}`;
      if (document.getElementById(rowId)) return;

      const data = change.doc.data();

      // Dynamically update the premium total transactions metric text on the UI
      incomeCounter++;
      if (totalTrxCountEl) {
        totalTrxCountEl.textContent = incomeCounter;
      }

      // ===============================
      // Status Logic Mapping (Matching New Light Theme Pill Classes)
      // ===============================
      // Income records use the status-confirmed-green style out of the box
      const statusText = "Confirmed";
      const statusCustomClass = "status-confirmed-green";

      // ---------------- TIME FORMATTING ----------------
      // Goal: 28/05/2026 format style from image
      let time = data.timestamp;
      if (time?.toDate) time = time.toDate();
      else if (time) time = new Date(time);

      const formattedDate = time ?
        String(time.getDate()).padStart(2, '0') + "/" +
        String(time.getMonth() + 1).padStart(2, '0') + "/" +
        time.getFullYear()
        : "-";

      // ---------------- DATA ATTRIBUTES ----------------
      const amount = data.amount ?? 0;
      const displayPlanTitle = data.plan || "Investment Profit";
      const subtitle = data.description || "Boku ROI Cycle";

      // ---------------- NEW STYLING UI RENDER ----------------
      // Fully rewritten card blocks following the new row architecture structure
      container.insertAdjacentHTML(
        "afterbegin",
        `
        <div class="record-card" id="${rowId}">
          <div class="card-top-row">
            <span class="record-amount-label">Amount</span>
            <span class="record-amount-label" style="font-size: 11.5px;">Type</span>
          </div>

          <div class="card-mid-row">
            <span class="record-amount-value" style="color: #16a34a;">
              +₦${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span class="record-status-pill ${statusCustomClass}">${statusText}</span>
          </div>

          <div class="card-mid-row" style="margin-top: -2px;">
            <span class="record-date-wrapper">
              <i class="fa-regular fa-calendar"></i> ${formattedDate}
            </span>
            <span style="font-size: 12px; font-weight: 500; color: var(--brand-primary-blue);">${displayPlanTitle}</span>
          </div>

          <div class="card-bottom-row">
            ${subtitle}
          </div>
        </div>
        `
      );
    });
  });
}





const commissionBtn = document.getElementById("commissionBtn");

commissionBtn?.addEventListener("click", () => {
  // Hide all pages safely
  if (typeof pages !== 'undefined' && pages.length) {
    pages.forEach(p => { if (p) p.style.display = "none"; });
  }

  // Hide navbar
  const navbar = document.getElementById("bottomNav");
  if (navbar) navbar.style.display = "none";

  // Show records page
  const recordsPage = document.getElementById("recordsPage");
  if (recordsPage) recordsPage.style.display = "block";

  // Load ONLY commission records
  const container = document.getElementById("recordsContainer");
  if (!container) return;

  loadCommissionRecords(container);
});


async function loadCommissionRecords(container) {
  if (!container) return;
  container.innerHTML = `<p id="commission-loading-msg" style="text-align:center; padding:20px; color:#64748b; font-size:14px; margin:0;">Loading commissions...</p>`;

  const user = auth.currentUser;
  if (!user) return;

  // Initialize card count tracker to dynamically update the Total Transactions panel
  let commissionCounter = 0;
  const totalTrxCountEl = document.getElementById("totalTrxCount");

  // ✅ Point specifically to the 'records' collection in Heavy Load DB
  const colRef = query(
    collection(transactionDb, "records"),
    where("uid", "==", user.uid)
  );

  onSnapshot(colRef, snapshot => {
    // Clear the loader message if data exists
    const loadingMsg = document.getElementById("commission-loading-msg");
    if (!snapshot.empty && loadingMsg) {
      loadingMsg.remove();
    }

    snapshot.docChanges().forEach(change => {
      if (change.type !== "added") return;

      const rowId = `commission-${change.doc.id}`;
      if (document.getElementById(rowId)) return;

      const data = change.doc.data();

      // Dynamically update the premium total transactions metric text on the UI
      commissionCounter++;
      if (totalTrxCountEl) {
        totalTrxCountEl.textContent = commissionCounter;
      }

      // ===============================
      // Status Logic Mapping (Matching New Light Theme Pill Classes)
      // ===============================
      const statusText = "Confirmed";
      const statusCustomClass = "status-confirmed-green";

      // ---------------- TIME FORMATTING ----------------
      // Goal: 28/05/2026 format style from image
      let time = data.timestamp || data.createdAt;
      if (time?.toDate) time = time.toDate();
      else if (time) time = new Date(time);

      const formattedDate = time ?
        String(time.getDate()).padStart(2, '0') + "/" +
        String(time.getMonth() + 1).padStart(2, '0') + "/" +
        time.getFullYear()
        : "-";

      // ---------------- DATA ATTRIBUTES ----------------
      const amount = data.amount || 0;
      const displayLabel = "Affiliate Reward";
      const subtitle = `From: ${data.refNumber || 'Referral'} (Level ${data.level || '1'})`;

      // ---------------- NEW STYLING UI RENDER ----------------
      // Fully rewritten card blocks following the new row architecture structure
      container.insertAdjacentHTML(
        "afterbegin",
        `
        <div class="record-card" id="${rowId}">
          <div class="card-top-row">
            <span class="record-amount-label">Amount</span>
            <span class="record-amount-label" style="font-size: 11.5px;">Type</span>
          </div>

          <div class="card-mid-row">
            <span class="record-amount-value" style="color: #16a34a;">
              +₦${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span class="record-status-pill ${statusCustomClass}">${statusText}</span>
          </div>

          <div class="card-mid-row" style="margin-top: -2px;">
            <span class="record-date-wrapper">
              <i class="fa-regular fa-calendar"></i> ${formattedDate}
            </span>
            <span style="font-size: 12px; font-weight: 500; color: var(--brand-primary-blue);">${displayLabel}</span>
          </div>

          <div class="card-bottom-row">
            ${subtitle}
          </div>
        </div>
        `
      );
    });

    if (snapshot.empty) {
      container.innerHTML = `<div style="text-align:center; padding:40px; color:#94a3b8; font-size:14px;">No commissions earned yet.</div>`;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Select the grid buttons and input
  const amountOptions = document.querySelectorAll('.amount-option');
  const customAmountInput = document.getElementById('customAmount');
  const selectedAmountDisplay = document.getElementById('selectedAmountDisplay');

  // Optional: update header display
  const headerSelectedAmount = document.getElementById('headerSelectedAmount');

  let selectedAmount = 0;

  function updateSelectedAmountDisplay() {
    const formatted = selectedAmount ? `₦${Number(selectedAmount).toLocaleString()}` : '₦0';

    const display = document.getElementById("selectedAmountDisplay");
    if (display) display.textContent = formatted;

    const headerDisplay = document.getElementById("headerSelectedAmount");
    if (headerDisplay) headerDisplay.textContent = formatted;
  }

  // ===== Grid Amount Click =====
  amountOptions.forEach(option => {
    option.addEventListener('click', () => {
      selectedAmount = option.dataset.value;

      // Fill custom input with the clicked amount
      customAmountInput.value = selectedAmount;

      // Update top amount display
      updateSelectedAmountDisplay();

      // Highlight active grid button
      amountOptions.forEach(o => o.classList.remove('active'));
      option.classList.add('active');
    });
  });

  // ===== Custom Amount Input =====
  customAmountInput.addEventListener('input', () => {
    selectedAmount = customAmountInput.value;

    // Update top display
    updateSelectedAmountDisplay();

    // Remove active class from grid buttons
    amountOptions.forEach(o => o.classList.remove('active'));
  });
});






document.addEventListener("DOMContentLoaded", function () {
  const nav = document.getElementById("bottomNav");

  if (!nav) {
    console.error("❌ Bottom navbar NOT found in HTML");
    return;
  }

  console.log("✅ Bottom navbar FOUND");

  // Force it visible (in case CSS hides it)
  nav.style.display = "flex";
  nav.style.visibility = "visible";
  nav.style.opacity = "1";
  nav.style.position = "fixed";
  nav.style.bottom = "0";
  nav.style.left = "0";
  nav.style.width = "100%";
  nav.style.zIndex = "99999";
});




// Scroll to last content in records page
function scrollToBottom() {
  const recordsPage = document.querySelector('.records-page');
  if (recordsPage) {
    recordsPage.scrollTop = recordsPage.scrollHeight;
  }
}

// Call after content is loaded or updated
scrollToBottom();







async function backfillInvestmentRecords(userId) {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return;

  const userData = userSnap.data();

  // ✅ QUOTA SAVER: If this user was already patched, STOP here.
  // This prevents hitting the database with 'updateDoc' every single login.
  if (userData.isPatched) return;

  const investments = userData.investments || [];
  let needsUpdate = false;

  const updatedInvestments = investments.map((inv) => {
    if (!inv.purchaseId) {
      inv.purchaseId = "LEGACY-" + Math.floor(Math.random() * 1000000);
      needsUpdate = true;
    }
    return inv;
  });

  if (needsUpdate) {
    await updateDoc(userRef, {
      investments: updatedInvestments,
      isPatched: true // ✅ Mark as patched forever
    });
    console.log("User patched successfully.");
  } else {
    // Even if they had no investments, mark them as patched so we don't check again
    await updateDoc(userRef, { isPatched: true });
  }
}


// ✅ PLACE THIS OUTSIDE ALL OTHER FUNCTIONS (Global Scope)
function toggleVisibility(inputId, iconEl) {
  const input = document.getElementById(inputId);
  if (!input) return;

  if (input.type === "password") {
    input.type = "text";
    // Change icon to See-No-Evil Monkey (🙉) (Acting as "Visible")
    iconEl.textContent = "🙉";
    iconEl.style.color = "var(--accent-purple)"; // Optional: Make it purple when showing
  } else {
    input.type = "password";
    // Change back to Hear-No-Evil Monkey (🙈) (Acting as "Hidden")
    iconEl.textContent = "🙈";
    iconEl.style.color = "#a1a7b3"; // Optional: Back to neutral
  }
}
// ONLY DO THIS IF YOU USE type="module"
window.toggleVisibility = toggleVisibility;



document.addEventListener("DOMContentLoaded", () => {
  // Select all navigation items within your bottom nav track
  const navItems = document.querySelectorAll("#bottomNav .nav-item");

  navItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      // 1. Prevent default jump if the href is just a placeholder "#"
      if (this.getAttribute("href") === "#") {
        e.preventDefault();
      }

      // 2. Remove the 'active' class from whichever item currently has it
      const currentActive = document.querySelector("#bottomNav .nav-item.active");
      if (currentActive) {
        currentActive.classList.remove("active");
      }

      // 3. Apply the electric cyan active state to the clicked element
      this.classList.add("active");
    });
  });
});


// Add this at the end of your JS file
console.log("Checking if setupReferral exists:", typeof setupReferral);
setupReferral("TEST-123");