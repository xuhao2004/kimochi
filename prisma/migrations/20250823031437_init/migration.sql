-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "studentId" TEXT,
    "teacherId" TEXT,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "zodiac" TEXT,
    "gender" TEXT,
    "birthDate" DATETIME,
    "className" TEXT,
    "accountType" TEXT NOT NULL DEFAULT 'self',
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profileImage" TEXT,
    "hasUpdatedProfile" BOOLEAN NOT NULL DEFAULT false,
    "genderModified" BOOLEAN NOT NULL DEFAULT false,
    "nicknameModified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "lastLatitude" REAL,
    "lastLongitude" REAL,
    "lastLocationName" TEXT,
    "lastWeatherSummary" TEXT,
    "lastWeatherTempC" REAL,
    "lastWeatherUpdatedAt" DATETIME,
    "lastDailyMessage" TEXT,
    "lastDailyAt" DATETIME,
    "createdByType" TEXT,
    "personalEmail" TEXT,
    "securityEmail" TEXT,
    "securityEmailExempt" BOOLEAN NOT NULL DEFAULT false,
    "college" TEXT,
    "major" TEXT,
    "office" TEXT,
    "phone" TEXT,
    "contactPhone" TEXT,
    "wechatOpenId" TEXT,
    "wechatUnionId" TEXT,
    "wechatBoundAt" DATETIME,
    "weappOpenId" TEXT,
    "weappUnionId" TEXT,
    "weappBoundAt" DATETIME
);

-- CreateTable
CREATE TABLE "UserAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "rawAnswers" TEXT,
    "analysisResult" TEXT,
    "psychologicalTags" TEXT,
    "overallScore" REAL,
    "riskLevel" TEXT,
    "recommendations" TEXT,
    "completionTime" INTEGER,
    "isSerious" BOOLEAN,
    "attentionCheckPass" BOOLEAN,
    "currentPage" INTEGER,
    "pausedAt" DATETIME,
    "elapsedTime" INTEGER NOT NULL DEFAULT 0,
    "deletedByUser" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "needsAttention" BOOLEAN NOT NULL DEFAULT false,
    "adminNotified" BOOLEAN NOT NULL DEFAULT false,
    "adminNotes" TEXT,
    "personalityType" TEXT,
    CONSTRAINT "Assessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssessmentAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assessmentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "responseTime" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssessmentAnswer_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdminMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" DATETIME,
    "processedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "friendId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "groupId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Friendship_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FriendGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Friendship_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Friendship_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FriendGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FriendGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatRoom" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "type" TEXT NOT NULL DEFAULT 'private',
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastMessageAt" DATETIME,
    CONSTRAINT "ChatRoom_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatRoomParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatRoomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ChatRoomParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatRoomParticipant_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "ChatRoom" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatRoomId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "replyToId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChatMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "ChatMessage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatMessage_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "ChatRoom" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssessmentInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatRoomId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "assessmentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssessmentInvite_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "ChatRoom" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssessmentInvite_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssessmentInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssessmentInvite_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssessmentInvite_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "system_stats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "totalWeatherQueries" INTEGER NOT NULL DEFAULT 0,
    "totalDailyMessages" INTEGER NOT NULL DEFAULT 0,
    "totalUsers" INTEGER NOT NULL DEFAULT 0,
    "onlineUsers" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "visibility" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedBy" TEXT,
    "pinnedAt" DATETIME,
    "tags" TEXT,
    "location" TEXT,
    "mood" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedBy" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PostComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedBy" TEXT,
    "pinnedAt" DATETIME,
    "replyToId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedBy" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PostComment_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "PostComment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PostComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "senderId" TEXT,
    "receiverId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "relatedPostId" TEXT,
    "relatedCommentId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" DATETIME,
    CONSTRAINT "UserMessage_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PostVisibility" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "friendId" TEXT,
    "groupId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostVisibility_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FriendGroup" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "PostVisibility_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "PostVisibility_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewerId" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Report_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Report_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ViolationReason" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AccountChangeRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "currentValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "verificationCode" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewerId" TEXT,
    "reviewReason" TEXT,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AccountChangeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AccountChangeRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "contact" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QrLoginSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nonce" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "QrLoginSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SecurityEmailChangeRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "oldEmail" TEXT,
    "newEmail" TEXT NOT NULL,
    "oldVerified" BOOLEAN NOT NULL DEFAULT false,
    "newVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewerId" TEXT,
    "reviewReason" TEXT,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SecurityEmailExemptRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewerId" TEXT,
    "reviewReason" TEXT,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_studentId_key" ON "User"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "User_teacherId_key" ON "User"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "User_wechatOpenId_key" ON "User"("wechatOpenId");

-- CreateIndex
CREATE UNIQUE INDEX "User_wechatUnionId_key" ON "User"("wechatUnionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_weappOpenId_key" ON "User"("weappOpenId");

-- CreateIndex
CREATE UNIQUE INDEX "User_weappUnionId_key" ON "User"("weappUnionId");

-- CreateIndex
CREATE INDEX "UserAction_userId_actionType_idx" ON "UserAction"("userId", "actionType");

-- CreateIndex
CREATE INDEX "UserAction_userId_createdAt_idx" ON "UserAction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Assessment_userId_type_idx" ON "Assessment"("userId", "type");

-- CreateIndex
CREATE INDEX "Assessment_riskLevel_idx" ON "Assessment"("riskLevel");

-- CreateIndex
CREATE INDEX "Assessment_needsAttention_adminNotified_idx" ON "Assessment"("needsAttention", "adminNotified");

-- CreateIndex
CREATE INDEX "AssessmentAnswer_assessmentId_idx" ON "AssessmentAnswer"("assessmentId");

-- CreateIndex
CREATE INDEX "AdminMessage_isRead_isProcessed_idx" ON "AdminMessage"("isRead", "isProcessed");

-- CreateIndex
CREATE INDEX "AdminMessage_createdAt_idx" ON "AdminMessage"("createdAt");

-- CreateIndex
CREATE INDEX "Friendship_userId_status_idx" ON "Friendship"("userId", "status");

-- CreateIndex
CREATE INDEX "Friendship_friendId_status_idx" ON "Friendship"("friendId", "status");

-- CreateIndex
CREATE INDEX "Friendship_groupId_idx" ON "Friendship"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_userId_friendId_key" ON "Friendship"("userId", "friendId");

-- CreateIndex
CREATE INDEX "FriendGroup_userId_order_idx" ON "FriendGroup"("userId", "order");

-- CreateIndex
CREATE INDEX "FriendGroup_userId_isDefault_idx" ON "FriendGroup"("userId", "isDefault");

-- CreateIndex
CREATE INDEX "ChatRoom_type_idx" ON "ChatRoom"("type");

-- CreateIndex
CREATE INDEX "ChatRoom_lastMessageAt_idx" ON "ChatRoom"("lastMessageAt");

-- CreateIndex
CREATE INDEX "ChatRoomParticipant_userId_idx" ON "ChatRoomParticipant"("userId");

-- CreateIndex
CREATE INDEX "ChatRoomParticipant_chatRoomId_isActive_idx" ON "ChatRoomParticipant"("chatRoomId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ChatRoomParticipant_chatRoomId_userId_key" ON "ChatRoomParticipant"("chatRoomId", "userId");

-- CreateIndex
CREATE INDEX "ChatMessage_chatRoomId_createdAt_idx" ON "ChatMessage"("chatRoomId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_senderId_idx" ON "ChatMessage"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentInvite_messageId_key" ON "AssessmentInvite"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentInvite_assessmentId_key" ON "AssessmentInvite"("assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentInvite_chatRoomId_status_createdAt_idx" ON "AssessmentInvite"("chatRoomId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AssessmentInvite_inviterId_idx" ON "AssessmentInvite"("inviterId");

-- CreateIndex
CREATE INDEX "AssessmentInvite_inviteeId_idx" ON "AssessmentInvite"("inviteeId");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_sessionToken_key" ON "user_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

-- CreateIndex
CREATE INDEX "user_sessions_lastActiveAt_idx" ON "user_sessions"("lastActiveAt");

-- CreateIndex
CREATE INDEX "Post_userId_createdAt_idx" ON "Post"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_visibility_isDeleted_createdAt_idx" ON "Post"("visibility", "isDeleted", "createdAt");

-- CreateIndex
CREATE INDEX "Post_isPinned_isDeleted_createdAt_idx" ON "Post"("isPinned", "isDeleted", "createdAt");

-- CreateIndex
CREATE INDEX "PostComment_postId_isPinned_isDeleted_createdAt_idx" ON "PostComment"("postId", "isPinned", "isDeleted", "createdAt");

-- CreateIndex
CREATE INDEX "PostComment_userId_createdAt_idx" ON "PostComment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserMessage_receiverId_isRead_createdAt_idx" ON "UserMessage"("receiverId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "UserMessage_senderId_createdAt_idx" ON "UserMessage"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "UserMessage_type_createdAt_idx" ON "UserMessage"("type", "createdAt");

-- CreateIndex
CREATE INDEX "PostVisibility_postId_idx" ON "PostVisibility"("postId");

-- CreateIndex
CREATE INDEX "PostVisibility_friendId_idx" ON "PostVisibility"("friendId");

-- CreateIndex
CREATE INDEX "PostVisibility_groupId_idx" ON "PostVisibility"("groupId");

-- CreateIndex
CREATE INDEX "Report_postId_idx" ON "Report"("postId");

-- CreateIndex
CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");

-- CreateIndex
CREATE INDEX "Report_reviewerId_idx" ON "Report"("reviewerId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");

-- CreateIndex
CREATE INDEX "ViolationReason_category_isActive_idx" ON "ViolationReason"("category", "isActive");

-- CreateIndex
CREATE INDEX "ViolationReason_order_idx" ON "ViolationReason"("order");

-- CreateIndex
CREATE INDEX "AccountChangeRequest_userId_idx" ON "AccountChangeRequest"("userId");

-- CreateIndex
CREATE INDEX "AccountChangeRequest_status_idx" ON "AccountChangeRequest"("status");

-- CreateIndex
CREATE INDEX "AccountChangeRequest_changeType_idx" ON "AccountChangeRequest"("changeType");

-- CreateIndex
CREATE INDEX "AccountChangeRequest_createdAt_idx" ON "AccountChangeRequest"("createdAt");

-- CreateIndex
CREATE INDEX "VerificationCode_contact_purpose_idx" ON "VerificationCode"("contact", "purpose");

-- CreateIndex
CREATE INDEX "VerificationCode_expiresAt_idx" ON "VerificationCode"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "QrLoginSession_nonce_key" ON "QrLoginSession"("nonce");

-- CreateIndex
CREATE INDEX "QrLoginSession_status_expiresAt_idx" ON "QrLoginSession"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "SecurityEmailChangeRequest_userId_idx" ON "SecurityEmailChangeRequest"("userId");

-- CreateIndex
CREATE INDEX "SecurityEmailChangeRequest_status_idx" ON "SecurityEmailChangeRequest"("status");

-- CreateIndex
CREATE INDEX "SecurityEmailChangeRequest_createdAt_idx" ON "SecurityEmailChangeRequest"("createdAt");

-- CreateIndex
CREATE INDEX "SecurityEmailExemptRequest_userId_idx" ON "SecurityEmailExemptRequest"("userId");

-- CreateIndex
CREATE INDEX "SecurityEmailExemptRequest_status_idx" ON "SecurityEmailExemptRequest"("status");

-- CreateIndex
CREATE INDEX "SecurityEmailExemptRequest_createdAt_idx" ON "SecurityEmailExemptRequest"("createdAt");
