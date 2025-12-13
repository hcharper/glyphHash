import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-primary">glyphHash</h1>
          <p className="mt-2 text-gray-600">Immutable Compliance Logging</p>
        </div>
        <SignUp routing="path" path="/sign-up" afterSignUpUrl="/onboarding" />
      </div>
    </div>
  );
}
