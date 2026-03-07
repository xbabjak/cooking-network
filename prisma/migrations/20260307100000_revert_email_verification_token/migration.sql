-- DropForeignKey
ALTER TABLE "EmailVerificationToken" DROP CONSTRAINT "EmailVerificationToken_userId_fkey";

-- DropIndex
DROP INDEX "EmailVerificationToken_tokenHash_key";

-- DropTable
DROP TABLE "EmailVerificationToken";
