// Global message queue and state
window.unityMessageQueue = [];
window.isUnityReady = false;

// Safe wrapper for SendMessage
window.SafeSendMessage = function (objectName, methodName, parameter) {
  if (typeof SendMessage === "function" && window.isUnityReady) {
    console.log("Sending message to Unity:", methodName, parameter);
    SendMessage(objectName, methodName, parameter);
  } else {
    console.warn("Unity not ready — queuing message:", methodName, parameter);
    window.unityMessageQueue.push({ objectName, methodName, parameter });

    // Retry mechanism to flush once Unity is ready
    if (!window.SafeSendMessage._retrying) {
      window.SafeSendMessage._retrying = true;
      const interval = setInterval(() => {
        if (typeof SendMessage === "function" && window.isUnityReady) {
          console.log("Unity is now ready — flushing queued messages.");
          while (window.unityMessageQueue.length > 0) {
            const msg = window.unityMessageQueue.shift();
            SendMessage(msg.objectName, msg.methodName, msg.parameter);
          }
          clearInterval(interval);
          window.SafeSendMessage._retrying = false;
        }
      }, 100);
    }
  }
};

// Called from Unity (via [DllImport]) when ready
window.OnUnityReady = function () {
  console.log("Unity signaled it's ready.");
  window.isUnityReady = true;

  // Just in case Unity was ready but SendMessage wasn’t
  window.SafeSendMessage(); // This will trigger the flush if needed
};

// Firebase
const db = firebase.firestore();

// Called by Unity to save full user profile
function SaveUserProfile(uid, name, age, gender, language, country) {
  const profileData = {
    uid: uid,
    name: name,
    age: age,
    gender: gender,
    language: language,
    country: country,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  db.collection("users").doc(uid).set(profileData, { merge: true })
    .then(() => {
      console.log("Profile saved:", uid);
     SendMessage("AuthFlowManager", "OnUserProfileSaved", uid);
    })
    .catch((error) => {
      console.error("Failed to save profile:", error);
    });
}

// Check if user exists
function CheckUserExists(uid) {
  console.log("Checking if user exists:", uid);
  db.collection("users").doc(uid).get()
    .then((doc) => {
      if (doc.exists) {
        console.log("User exists:", uid);
        SendMessage("AuthFlowManager", "OnUserProfileExists", uid);
      } else {
        console.log("User does not exist:", uid);
        SendMessage("AuthFlowManager", "OnUserProfileNotFound", uid);
      }
    })
    .catch((error) => {
      console.error("Error checking user:", error);
    });
}
