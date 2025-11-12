// Importa Firebase compat libs
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Inicializa o app Firebase
firebase.initializeApp({
  apiKey: self.FIREBASE_API_KEY || "AIzaSyCsvatTo3fk3-qBNNM_1p79RKLxPR36bd4",
  authDomain: "smartbell-cdbe1.firebaseapp.com",
  projectId: "smartbell-cdbe1",
  storageBucket: "smartbell-cdbe1.firebasestorage.app",
  messagingSenderId: "282305468523",
  appId: "1:282305468523:web:f741011c69b6b14a62392e",
  measurementId: "BF1ySQhgErYi5i7ntwDtRYAMF3c6rCvBjF4iygArr_Z3jvaEivzPN8GYsTRVRHem-9D0WJGOtkHXxXGsLK8YIaQ",
});

// Inicializa o serviço de mensagens
const messaging = firebase.messaging();

// Listener para mensagens em background
messaging.onBackgroundMessage((payload) => {
  console.log('[SmartBell] Mensagem recebida em background:', payload);
  
  const { title, body, icon } = payload.notification;
  
  self.registration.showNotification(title, {
    body,
    icon: icon || "/icons/icon-192.png",
  });
});

