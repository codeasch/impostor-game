import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-primary">404</h1>
          <h2 className="text-2xl font-semibold">Page Not Found</h2>
          <p className="text-muted-foreground">
            The page you&#39;re looking for doesn&#39;t exist.
          </p>
        </div>
        
        <Button asChild>
          <Link href="/">
            Back to Home
          </Link>
        </Button>
      </div>
    </div>
  );
}

