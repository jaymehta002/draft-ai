-- Stop using MailboxSync as a refresh-token cache; Account is the sole source of truth.
UPDATE "MailboxSync" SET "encryptedRefreshToken" = NULL;
