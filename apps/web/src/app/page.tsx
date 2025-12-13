import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { redirect } from 'next/navigation';

export default async function Home() {
  // Redirect directly to dashboard for demo
  redirect('/dashboard');
}
