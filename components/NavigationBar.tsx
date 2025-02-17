import React from 'react';
import { Button } from './ui/button';
import Link from 'next/link';

const NavigationBar: React.FC = () => {
  return (
    <nav className="flex justify-center gap-4 my-4">
      <Link href="/issues" passHref>
        <Button asChild>
          <a>Issues</a>
        </Button>
      </Link>
      <Link href="/pullRequests" passHref>
        <Button asChild>
          <a>Pull Requests</a>
        </Button>
      </Link>
    </nav>
  );
};

export default NavigationBar;
