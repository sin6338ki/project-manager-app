-- CreateTable
CREATE TABLE "AssigneeTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "assigneeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssigneeTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "ProjectAssignee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
