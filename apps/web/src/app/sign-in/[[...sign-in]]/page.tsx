import { ClerkProvider, SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-primary">glyphHash</h1>
          <p className="mt-2 text-gray-600">Immutable Compliance Logging</p>
        </div>
        <SignIn routing="path" path="/sign-in" afterSignInUrl="/dashboard" />
      </div>
    </div>
  );
}
