-- CreateIndex
CREATE UNIQUE INDEX "OauthClientSlack_userId_slackTeamId_key" ON "OauthClientSlack"("userId", "slackTeamId");
