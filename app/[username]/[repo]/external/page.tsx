import { Suspense, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Props {
  params: {
    username: string;
    repo: string;
  };
}

export default function ExternalPage({ params }: Props) {
  const { username, repo } = params;
  const [url, setUrl] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/github/fetchDetails/route.ts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch details.');
      }

      const result = await response.json();
      setData(result);
    } catch (ex) {
      setError((ex as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        {username} / {repo} - External
      </h1>
      <div className="mb-4">
        <Input
          type="text"
          placeholder="Enter GitHub URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="mb-2"
        />
        <Button onClick={fetchDetails} disabled={loading}>
          {loading ? 'Loading...' : 'Fetch Details'}
        </Button>
      </div>
      {error && <div className="text-red-500">{error}</div>}
      {data && !loading && !error && (
        <div className="p-4 bg-gray-100 rounded">
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
}
