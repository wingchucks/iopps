/**
 * Automated test script for Messaging and Notifications
 * Run with: npx tsx scripts/test-messaging-notifications.ts
 */

// Load environment variables first
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Initialize Firebase Admin
if (!getApps().length) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.error("Missing Firebase credentials in environment variables");
    process.exit(1);
  }

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();

// Test IDs (use fake IDs for testing)
const TEST_EMPLOYER_ID = "test-employer-" + Date.now();
const TEST_MEMBER_ID = "test-member-" + Date.now();
const TEST_JOB_ID = "test-job-" + Date.now();

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function log(message: string) {
  console.log(`[TEST] ${message}`);
}

function success(testName: string) {
  console.log(`  ✓ ${testName}`);
  results.push({ name: testName, passed: true });
}

function fail(testName: string, error: string) {
  console.log(`  ✗ ${testName}: ${error}`);
  results.push({ name: testName, passed: false, error });
}

// ============================================
// NOTIFICATION TESTS
// ============================================

async function testCreateNotification(): Promise<string | null> {
  log("Testing notification creation...");

  try {
    const notificationData = {
      userId: TEST_EMPLOYER_ID,
      type: "new_application",
      title: "Test Notification",
      message: "This is a test notification",
      read: false,
      link: "/test",
      relatedJobId: TEST_JOB_ID,
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("notifications").add(notificationData);

    if (docRef.id) {
      success("Create notification");
      return docRef.id;
    } else {
      fail("Create notification", "No document ID returned");
      return null;
    }
  } catch (error: any) {
    fail("Create notification", error.message);
    return null;
  }
}

async function testGetNotifications(notificationId: string): Promise<boolean> {
  log("Testing get notifications...");

  try {
    const snapshot = await db
      .collection("notifications")
      .where("userId", "==", TEST_EMPLOYER_ID)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (notifications.length > 0 && notifications.some(n => n.id === notificationId)) {
      success("Get notifications");
      return true;
    } else {
      fail("Get notifications", "Notification not found in results");
      return false;
    }
  } catch (error: any) {
    fail("Get notifications", error.message);
    return false;
  }
}

async function testMarkNotificationAsRead(notificationId: string): Promise<boolean> {
  log("Testing mark notification as read...");

  try {
    await db.collection("notifications").doc(notificationId).update({
      read: true,
    });

    const doc = await db.collection("notifications").doc(notificationId).get();
    const data = doc.data();

    if (data?.read === true) {
      success("Mark notification as read");
      return true;
    } else {
      fail("Mark notification as read", "Read status not updated");
      return false;
    }
  } catch (error: any) {
    fail("Mark notification as read", error.message);
    return false;
  }
}

async function testGetUnreadCount(): Promise<boolean> {
  log("Testing unread notification count...");

  try {
    // Create an unread notification
    await db.collection("notifications").add({
      userId: TEST_EMPLOYER_ID,
      type: "new_message",
      title: "Unread Test",
      message: "This should be unread",
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    const snapshot = await db
      .collection("notifications")
      .where("userId", "==", TEST_EMPLOYER_ID)
      .where("read", "==", false)
      .get();

    if (snapshot.size >= 1) {
      success("Get unread count");
      return true;
    } else {
      fail("Get unread count", `Expected at least 1 unread, got ${snapshot.size}`);
      return false;
    }
  } catch (error: any) {
    fail("Get unread count", error.message);
    return false;
  }
}

// ============================================
// MESSAGING TESTS
// ============================================

async function testCreateConversation(): Promise<string | null> {
  log("Testing conversation creation...");

  try {
    const conversationData = {
      employerId: TEST_EMPLOYER_ID,
      memberId: TEST_MEMBER_ID,
      jobId: TEST_JOB_ID,
      employerName: "Test Employer Inc",
      memberName: "Test Member",
      memberEmail: "test@example.com",
      jobTitle: "Test Job Position",
      lastMessage: null,
      lastMessageAt: null,
      lastMessageBy: null,
      employerUnreadCount: 0,
      memberUnreadCount: 0,
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("conversations").add(conversationData);

    if (docRef.id) {
      success("Create conversation");
      return docRef.id;
    } else {
      fail("Create conversation", "No document ID returned");
      return null;
    }
  } catch (error: any) {
    fail("Create conversation", error.message);
    return null;
  }
}

async function testSendMessage(conversationId: string): Promise<string | null> {
  log("Testing send message...");

  try {
    const messageData = {
      conversationId,
      senderId: TEST_EMPLOYER_ID,
      senderType: "employer",
      content: "Hello, this is a test message!",
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("messages").add(messageData);

    // Update conversation with last message
    await db.collection("conversations").doc(conversationId).update({
      lastMessage: messageData.content,
      lastMessageAt: FieldValue.serverTimestamp(),
      lastMessageBy: TEST_EMPLOYER_ID,
      memberUnreadCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (docRef.id) {
      success("Send message");
      return docRef.id;
    } else {
      fail("Send message", "No document ID returned");
      return null;
    }
  } catch (error: any) {
    fail("Send message", error.message);
    return null;
  }
}

async function testGetConversationMessages(conversationId: string, messageId: string): Promise<boolean> {
  log("Testing get conversation messages...");

  try {
    const snapshot = await db
      .collection("messages")
      .where("conversationId", "==", conversationId)
      .orderBy("createdAt", "asc")
      .get();

    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (messages.length > 0 && messages.some(m => m.id === messageId)) {
      success("Get conversation messages");
      return true;
    } else {
      fail("Get conversation messages", "Message not found in conversation");
      return false;
    }
  } catch (error: any) {
    fail("Get conversation messages", error.message);
    return false;
  }
}

async function testGetEmployerConversations(conversationId: string): Promise<boolean> {
  log("Testing get employer conversations...");

  try {
    const snapshot = await db
      .collection("conversations")
      .where("employerId", "==", TEST_EMPLOYER_ID)
      .where("status", "==", "active")
      .orderBy("lastMessageAt", "desc")
      .get();

    const conversations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (conversations.some(c => c.id === conversationId)) {
      success("Get employer conversations");
      return true;
    } else {
      fail("Get employer conversations", "Conversation not found for employer");
      return false;
    }
  } catch (error: any) {
    fail("Get employer conversations", error.message);
    return false;
  }
}

async function testGetMemberConversations(conversationId: string): Promise<boolean> {
  log("Testing get member conversations...");

  try {
    const snapshot = await db
      .collection("conversations")
      .where("memberId", "==", TEST_MEMBER_ID)
      .where("status", "==", "active")
      .orderBy("lastMessageAt", "desc")
      .get();

    const conversations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (conversations.some(c => c.id === conversationId)) {
      success("Get member conversations");
      return true;
    } else {
      fail("Get member conversations", "Conversation not found for member");
      return false;
    }
  } catch (error: any) {
    fail("Get member conversations", error.message);
    return false;
  }
}

async function testMarkMessagesAsRead(conversationId: string): Promise<boolean> {
  log("Testing mark messages as read...");

  try {
    const snapshot = await db
      .collection("messages")
      .where("conversationId", "==", conversationId)
      .where("read", "==", false)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });
    await batch.commit();

    // Verify all messages are now read
    const verifySnapshot = await db
      .collection("messages")
      .where("conversationId", "==", conversationId)
      .where("read", "==", false)
      .get();

    if (verifySnapshot.empty) {
      success("Mark messages as read");
      return true;
    } else {
      fail("Mark messages as read", "Some messages still unread");
      return false;
    }
  } catch (error: any) {
    fail("Mark messages as read", error.message);
    return false;
  }
}

// ============================================
// CLEANUP
// ============================================

async function cleanup(notificationIds: string[], conversationId: string | null, messageIds: string[]) {
  log("Cleaning up test data...");

  try {
    // Delete test notifications
    for (const id of notificationIds) {
      await db.collection("notifications").doc(id).delete();
    }

    // Delete all notifications for test user
    const notifSnapshot = await db
      .collection("notifications")
      .where("userId", "==", TEST_EMPLOYER_ID)
      .get();
    for (const doc of notifSnapshot.docs) {
      await doc.ref.delete();
    }

    // Delete test messages
    for (const id of messageIds) {
      await db.collection("messages").doc(id).delete();
    }

    // Delete test conversation
    if (conversationId) {
      // First delete all messages in the conversation
      const msgSnapshot = await db
        .collection("messages")
        .where("conversationId", "==", conversationId)
        .get();
      for (const doc of msgSnapshot.docs) {
        await doc.ref.delete();
      }

      await db.collection("conversations").doc(conversationId).delete();
    }

    console.log("  ✓ Cleanup complete");
  } catch (error: any) {
    console.log(`  ⚠ Cleanup warning: ${error.message}`);
  }
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function runTests() {
  console.log("\n========================================");
  console.log("  MESSAGING & NOTIFICATIONS TEST SUITE");
  console.log("========================================\n");

  const notificationIds: string[] = [];
  let conversationId: string | null = null;
  const messageIds: string[] = [];

  try {
    // Notification tests
    console.log("\n--- NOTIFICATION TESTS ---\n");

    const notifId = await testCreateNotification();
    if (notifId) {
      notificationIds.push(notifId);
      await testGetNotifications(notifId);
      await testMarkNotificationAsRead(notifId);
    }
    await testGetUnreadCount();

    // Messaging tests
    console.log("\n--- MESSAGING TESTS ---\n");

    conversationId = await testCreateConversation();
    if (conversationId) {
      const msgId = await testSendMessage(conversationId);
      if (msgId) {
        messageIds.push(msgId);
        await testGetConversationMessages(conversationId, msgId);
      }
      await testGetEmployerConversations(conversationId);
      await testGetMemberConversations(conversationId);
      await testMarkMessagesAsRead(conversationId);
    }

  } finally {
    // Always cleanup
    console.log("\n--- CLEANUP ---\n");
    await cleanup(notificationIds, conversationId, messageIds);
  }

  // Print summary
  console.log("\n========================================");
  console.log("  TEST RESULTS SUMMARY");
  console.log("========================================\n");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`  Total:  ${results.length}`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log("");

  if (failed > 0) {
    console.log("  Failed tests:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => console.log(`    - ${r.name}: ${r.error}`));
    console.log("");
  }

  console.log(failed === 0 ? "  ✓ All tests passed!\n" : "  ✗ Some tests failed\n");

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error("Test suite failed:", error);
  process.exit(1);
});
