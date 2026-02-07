import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    increment,
    serverTimestamp,
    Timestamp,
    deleteDoc,
    addDoc,
    documentId,
    DocumentSnapshot
} from "firebase/firestore";
import { db } from "../firebase";
import { Post, Comment, Connection, Activity, AuthorType, PostType, PostVisibility, MemberProfile, ReactionType, Reaction, ReactionsCount, SavedPost } from "../types";

// Helper to ensure DB is initialized
function getDb() {
    if (!db) {
        throw new Error("Firestore is not initialized");
    }
    return db;
}

// ============================================
// POSTS
// ============================================

export async function createPost(postData: Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'likesCount' | 'commentsCount' | 'sharesCount'>) {
    const firestore = getDb();
    const postsRef = collection(firestore, "posts");
    const newPostRef = doc(postsRef);

    const post: Post = {
        id: newPostRef.id,
        ...postData,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
    };

    await setDoc(newPostRef, post);

    return post;
}

export async function getFeedPosts(limitCount: number = 20, lastSnapshot?: DocumentSnapshot) {
    const firestore = getDb();
    const postsRef = collection(firestore, "posts");

    // Basic public feed for now. 
    let q = query(
        postsRef,
        where("visibility", "==", "public"),
        orderBy("createdAt", "desc"),
        limit(limitCount)
    );

    if (lastSnapshot) {
        q = query(q, startAfter(lastSnapshot));
    }

    const snapshot = await getDocs(q);
    return {
        posts: snapshot.docs.map(doc => doc.data() as Post),
        lastSnapshot: snapshot.docs[snapshot.docs.length - 1]
    };
}

export async function getUserPosts(userId: string, limitCount: number = 20) {
    const firestore = getDb();
    const postsRef = collection(firestore, "posts");
    const q = query(
        postsRef,
        where("authorId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Post);
}

// ============================================
// INTERACTIONS (Likes/Comments)
// ============================================

export async function toggleLikePost(postId: string, userId: string) {
    const firestore = getDb();
    const likeRef = doc(firestore, "posts", postId, "likes", userId);
    const postRef = doc(firestore, "posts", postId);

    const likeSnap = await getDoc(likeRef);

    if (likeSnap.exists()) {
        // Unlike
        await deleteDoc(likeRef);
        await updateDoc(postRef, {
            likesCount: increment(-1)
        });
        return false;
    } else {
        // Like
        await setDoc(likeRef, {
            userId,
            createdAt: serverTimestamp()
        });
        await updateDoc(postRef, {
            likesCount: increment(1)
        });
        return true;
    }
}

export async function hasUserLikedPost(postId: string, userId: string): Promise<boolean> {
    const firestore = getDb();
    const likeRef = doc(firestore, "posts", postId, "likes", userId);
    const likeSnap = await getDoc(likeRef);
    return likeSnap.exists();
}

export async function addComment(postId: string, commentData: Omit<Comment, 'id' | 'createdAt' | 'updatedAt' | 'likesCount'>) {
    const firestore = getDb();
    const commentsRef = collection(firestore, "posts", postId, "comments");
    const newCommentRef = doc(commentsRef);
    const postRef = doc(firestore, "posts", postId);

    const comment: Comment = {
        id: newCommentRef.id,
        ...commentData,
        likesCount: 0,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
    };

    await setDoc(newCommentRef, comment);
    await updateDoc(postRef, {
        commentsCount: increment(1)
    });

    return comment;
}

export async function getComments(postId: string) {
    const firestore = getDb();
    const commentsRef = collection(firestore, "posts", postId, "comments");
    const q = query(commentsRef, orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Comment);
}

// ============================================
// CONNECTIONS
// ============================================

export async function sendConnectionRequest(requesterId: string, recipientId: string, message?: string) {
    const firestore = getDb();

    // Fetch profiles for denormalization
    const [requesterSnap, recipientSnap] = await Promise.all([
        getDoc(doc(firestore, "memberProfiles", requesterId)),
        getDoc(doc(firestore, "memberProfiles", recipientId))
    ]);

    const requesterData = requesterSnap.exists() ? requesterSnap.data() as MemberProfile : null;
    const recipientData = recipientSnap.exists() ? recipientSnap.data() as MemberProfile : null;

    // Check if already connected or pending
    const connectionsRef = collection(firestore, "connections");
    const q = query(
        connectionsRef,
        where("requesterId", "==", requesterId),
        where("recipientId", "==", recipientId)
    );

    const existing = await getDocs(q);
    if (!existing.empty) {
        throw new Error("Connection request already exists");
    }

    const newConnRef = doc(connectionsRef);
    const connection: Connection = {
        id: newConnRef.id,
        requesterId,
        recipientId,
        status: 'pending',
        message: message || undefined,
        requesterName: requesterData?.displayName || "Member",
        requesterAvatarUrl: requesterData?.photoURL || "",
        requesterTagline: requesterData?.tagline || "",
        recipientName: recipientData?.displayName || "Member",
        recipientAvatarUrl: recipientData?.photoURL || "",
        recipientTagline: recipientData?.tagline || "",
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
    };

    await setDoc(newConnRef, connection);
    return connection;
}

export async function respondToConnectionRequest(connectionId: string, status: 'accepted' | 'declined') {
    const firestore = getDb();
    const connRef = doc(firestore, "connections", connectionId);

    await updateDoc(connRef, {
        status,
        connectedAt: status === 'accepted' ? serverTimestamp() : null
    });
}

export async function getMyConnections(userId: string) {
    const firestore = getDb();
    const connectionsRef = collection(firestore, "connections");

    const q1 = query(
        connectionsRef,
        where("requesterId", "==", userId),
        where("status", "==", "accepted")
    );

    const q2 = query(
        connectionsRef,
        where("recipientId", "==", userId),
        where("status", "==", "accepted")
    );

    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

    const connections = [...snap1.docs, ...snap2.docs].map(d => d.data() as Connection);
    return connections;
}

export async function getPendingConnectionRequests(userId: string) {
    const firestore = getDb();
    const connectionsRef = collection(firestore, "connections");

    // Requests SENT TO me that are PENDING
    const q = query(
        connectionsRef,
        where("recipientId", "==", userId),
        where("status", "==", "pending")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Connection);
}

// Check if there is a pending request FROM me TO them (to show "Cancel Request" or "Pending" on button)
export async function getConnectionStatus(myUserId: string, otherUserId: string): Promise<Connection['status'] | 'none' | 'pending_sent' | 'pending_received'> {
    const firestore = getDb();
    const connectionsRef = collection(firestore, "connections");

    // Check if I sent a request
    const q1 = query(
        connectionsRef,
        where("requesterId", "==", myUserId),
        where("recipientId", "==", otherUserId)
    );

    // Check if they sent a request
    const q2 = query(
        connectionsRef,
        where("requesterId", "==", otherUserId),
        where("recipientId", "==", myUserId)
    );

    const [sentSnap, receivedSnap] = await Promise.all([getDocs(q1), getDocs(q2)]);

    if (!sentSnap.empty) {
        const conn = sentSnap.docs[0].data() as Connection;
        return conn.status === 'accepted' ? 'accepted' : 'pending_sent';
    }

    if (!receivedSnap.empty) {
        const conn = receivedSnap.docs[0].data() as Connection;
        return conn.status === 'accepted' ? 'accepted' : 'pending_received';
    }

    return 'none';
}

export async function getSuggestedConnections(userId: string) {
    const firestore = getDb();
    // For now, this is a "dumb" suggestion - just return some recent users who aren't me
    // In a real app, we'd filter by industry/skills and exclude existing connections
    // TODO: Enhance with Algolia or more complex queries
    const membersRef = collection(firestore, "memberProfiles");

    const q = query(membersRef, limit(5)); // Just grab 5 random members for demo
    const snapshot = await getDocs(q);

    return snapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as MemberProfile))
        .filter(m => m.id !== userId); // Filter self
}

export async function getSuggestedOrganizations(limitCount: number = 5) {
    const firestore = getDb();
    const employersRef = collection(firestore, "employers");

    // Simple fetch for now - get approved employers only
    const q = query(
        employersRef,
        where("status", "==", "approved"),
        limit(limitCount)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ============================================
// SHARING
// ============================================

export async function shareEntity(
    userId: string,
    userInfo: { name: string, avatarUrl?: string },
    entityType: PostType,
    entityReferenceId: string,
    entityData: any,
    comment?: string
) {
    // Sharing is just creating a post with special metadata
    return createPost({
        authorId: userId,
        authorType: 'member',
        authorName: userInfo.name,
        authorAvatarUrl: userInfo.avatarUrl,
        content: comment || "",
        type: entityType,
        visibility: 'public',
        referenceId: entityReferenceId,
    });
}

// ============================================
// FOLLOWING (Organizations/Mentors)
// ============================================

export async function followOrganization(userId: string, orgId: string) {
    const firestore = getDb();
    // Use a subcollection on the organization for followers
    // This allows easy counting and checking
    const followRef = doc(firestore, "organizations", orgId, "followers", userId);

    await setDoc(followRef, {
        userId,
        createdAt: serverTimestamp()
    });

    // Optional: Increment follower count on organization doc (if we have a field for it)
    const orgRef = doc(firestore, "organizations", orgId);
    await updateDoc(orgRef, {
        followersCount: increment(1)
    }).catch((err) => {
        console.error("Failed to update follower count:", err);
    });

    return true;
}

export async function unfollowOrganization(userId: string, orgId: string) {
    const firestore = getDb();
    const followRef = doc(firestore, "organizations", orgId, "followers", userId);

    await deleteDoc(followRef);

    // Decrement follower count
    const orgRef = doc(firestore, "organizations", orgId);
    await updateDoc(orgRef, {
        followersCount: increment(-1)
    }).catch((err) => {
        console.error("Failed to update follower count:", err);
    });

    return true;
}

export async function getOrganizationFollowStatus(userId: string, orgId: string): Promise<boolean> {
    const firestore = getDb();
    const followRef = doc(firestore, "organizations", orgId, "followers", userId);
    const snap = await getDoc(followRef);
    return snap.exists();
}

// ============================================
// POST DETAIL
// ============================================

export async function getPost(postId: string): Promise<Post | null> {
    const firestore = getDb();
    const postRef = doc(firestore, "posts", postId);
    const snap = await getDoc(postRef);
    if (!snap.exists()) return null;
    return snap.data() as Post;
}

// ============================================
// REACTIONS (Love / Honor / Fire)
// ============================================

export async function addReaction(postId: string, userId: string, type: ReactionType): Promise<void> {
    const firestore = getDb();
    const reactionRef = doc(firestore, "posts", postId, "reactions", userId);
    const postRef = doc(firestore, "posts", postId);

    // Check if user already has a reaction
    const existingSnap = await getDoc(reactionRef);
    const existingType = existingSnap.exists() ? (existingSnap.data() as Reaction).type : null;

    // Set the new reaction
    await setDoc(reactionRef, {
        userId,
        type,
        createdAt: serverTimestamp(),
    });

    // Update counts: decrement old type if different, increment new type
    const updates: Record<string, unknown> = {
        [`reactionsCount.${type}`]: increment(1),
    };
    if (existingType && existingType !== type) {
        updates[`reactionsCount.${existingType}`] = increment(-1);
    }
    await updateDoc(postRef, updates);
}

export async function removeReaction(postId: string, userId: string): Promise<void> {
    const firestore = getDb();
    const reactionRef = doc(firestore, "posts", postId, "reactions", userId);
    const postRef = doc(firestore, "posts", postId);

    const snap = await getDoc(reactionRef);
    if (!snap.exists()) return;

    const type = (snap.data() as Reaction).type;
    await deleteDoc(reactionRef);
    await updateDoc(postRef, {
        [`reactionsCount.${type}`]: increment(-1),
    });
}

export async function getUserReaction(postId: string, userId: string): Promise<ReactionType | null> {
    const firestore = getDb();
    const reactionRef = doc(firestore, "posts", postId, "reactions", userId);
    const snap = await getDoc(reactionRef);
    if (!snap.exists()) return null;
    return (snap.data() as Reaction).type;
}

// ============================================
// THREADED COMMENTS
// ============================================

export interface ThreadedComment extends Comment {
    replies: ThreadedComment[];
}

export async function getThreadedComments(postId: string): Promise<ThreadedComment[]> {
    const firestore = getDb();
    const commentsRef = collection(firestore, "posts", postId, "comments");
    const q = query(commentsRef, orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);

    const allComments = snapshot.docs.map(d => d.data() as Comment);

    // Separate top-level and replies
    const topLevel: ThreadedComment[] = [];
    const replyMap = new Map<string, ThreadedComment[]>();

    for (const comment of allComments) {
        const threaded: ThreadedComment = { ...comment, replies: [] };

        if (comment.parentCommentId) {
            const existing = replyMap.get(comment.parentCommentId) || [];
            existing.push(threaded);
            replyMap.set(comment.parentCommentId, existing);
        } else {
            topLevel.push(threaded);
        }
    }

    // Attach replies to their parents
    for (const comment of topLevel) {
        comment.replies = replyMap.get(comment.id) || [];
    }

    return topLevel;
}

// ============================================
// DELETE POST
// ============================================

export async function deletePost(postId: string, userId: string): Promise<void> {
    const firestore = getDb();
    const postRef = doc(firestore, "posts", postId);
    const snap = await getDoc(postRef);

    if (!snap.exists()) {
        throw new Error("Post not found");
    }

    const post = snap.data() as Post;
    if (post.authorId !== userId) {
        throw new Error("You can only delete your own posts");
    }

    await deleteDoc(postRef);
}

// ============================================
// DELETE COMMENT
// ============================================

export async function deleteComment(postId: string, commentId: string, userId: string): Promise<void> {
    const firestore = getDb();
    const commentRef = doc(firestore, "posts", postId, "comments", commentId);
    const postRef = doc(firestore, "posts", postId);
    const snap = await getDoc(commentRef);

    if (!snap.exists()) {
        throw new Error("Comment not found");
    }

    const comment = snap.data() as Comment;
    if (comment.authorId !== userId) {
        throw new Error("You can only delete your own comments");
    }

    await deleteDoc(commentRef);
    await updateDoc(postRef, {
        commentsCount: increment(-1)
    });
}

// ============================================
// COMMENT LIKES
// ============================================

export async function toggleLikeComment(postId: string, commentId: string, userId: string): Promise<boolean> {
    const firestore = getDb();
    const likeRef = doc(firestore, "posts", postId, "comments", commentId, "likes", userId);
    const commentRef = doc(firestore, "posts", postId, "comments", commentId);

    const likeSnap = await getDoc(likeRef);

    if (likeSnap.exists()) {
        // Unlike
        await deleteDoc(likeRef);
        await updateDoc(commentRef, {
            likesCount: increment(-1)
        });
        return false;
    } else {
        // Like
        await setDoc(likeRef, {
            userId,
            createdAt: serverTimestamp()
        });
        await updateDoc(commentRef, {
            likesCount: increment(1)
        });
        return true;
    }
}

export async function hasUserLikedComment(postId: string, commentId: string, userId: string): Promise<boolean> {
    const firestore = getDb();
    const likeRef = doc(firestore, "posts", postId, "comments", commentId, "likes", userId);
    const likeSnap = await getDoc(likeRef);
    return likeSnap.exists();
}

// ============================================
// SAVED POSTS
// ============================================

const savedPostsCollection = "savedPosts";

export async function toggleSavePost(memberId: string, postId: string, shouldSave: boolean): Promise<void> {
    const firestore = getDb();
    const snapshot = await getDocs(
        query(
            collection(firestore, savedPostsCollection),
            where("memberId", "==", memberId),
            where("postId", "==", postId)
        )
    );

    if (shouldSave) {
        if (snapshot.empty) {
            await addDoc(collection(firestore, savedPostsCollection), {
                memberId,
                postId,
                createdAt: serverTimestamp(),
            });
        }
    } else {
        await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));
    }
}

export async function listSavedPosts(memberId: string): Promise<SavedPost[]> {
    const firestore = getDb();
    const ref = collection(firestore, savedPostsCollection);
    const q = query(
        ref,
        where("memberId", "==", memberId),
        orderBy("createdAt", "desc"),
        limit(100)
    );
    const snap = await getDocs(q);

    if (snap.empty) return [];

    const postIds = snap.docs.map((d) => (d.data() as SavedPost).postId);

    // Batch fetch posts
    const postsMap = new Map<string, Post>();
    const batchSize = 30;
    for (let i = 0; i < postIds.length; i += batchSize) {
        const batchIds = postIds.slice(i, i + batchSize);
        if (batchIds.length > 0) {
            const postsRef = collection(firestore, "posts");
            const postsQuery = query(postsRef, where(documentId(), "in", batchIds));
            const postsSnap = await getDocs(postsQuery);
            postsSnap.docs.forEach((postDoc) => {
                postsMap.set(postDoc.id, { ...postDoc.data() as Post, id: postDoc.id });
            });
        }
    }

    return snap.docs.map((d) => {
        const data = d.data() as SavedPost;
        return {
            ...data,
            id: d.id,
            post: postsMap.get(data.postId) || null,
        };
    });
}

export async function isPostSaved(memberId: string, postId: string): Promise<boolean> {
    const firestore = getDb();
    const snapshot = await getDocs(
        query(
            collection(firestore, savedPostsCollection),
            where("memberId", "==", memberId),
            where("postId", "==", postId),
            limit(1)
        )
    );
    return !snapshot.empty;
}

