"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface WooCommerceFormProps {
  isConnected: boolean;
  onConnectionChange: () => void;
}

export function WooCommerceForm({ isConnected, onConnectionChange }: WooCommerceFormProps) {
  const [storeUrl, setStoreUrl] = useState('');
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleTest = async () => {
    if (!storeUrl || !consumerKey || !consumerSecret) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch('/api/woocommerce/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeUrl, consumerKey, consumerSecret }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Connection successful!');
      } else {
        toast.error(data.error || 'Connection failed');
      }
    } catch (error) {
      toast.error('Failed to test connection');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!storeUrl || !consumerKey || !consumerSecret) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/woocommerce/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeUrl, consumerKey, consumerSecret }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('WooCommerce connected successfully!');
        onConnectionChange();
      } else {
        toast.error(data.error || 'Failed to save connection');
      }
    } catch (error) {
      toast.error('Failed to save connection');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/woocommerce/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('WooCommerce disconnected');
        setStoreUrl('');
        setConsumerKey('');
        setConsumerSecret('');
        onConnectionChange();
      } else {
        toast.error('Failed to disconnect');
      }
    } catch (error) {
      toast.error('Failed to disconnect');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>WooCommerce Connection</CardTitle>
            <CardDescription>
              Connect your WooCommerce store using REST API credentials
            </CardDescription>
          </div>
          {isConnected ? (
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              Not Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="wc-store-url">Store URL</Label>
          <Input
            id="wc-store-url"
            placeholder="https://your-store.com"
            value={storeUrl}
            onChange={(e) => setStoreUrl(e.target.value)}
            disabled={isConnected}
          />
          <p className="text-xs text-muted-foreground">
            Your WooCommerce store URL (e.g., https://example.com)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="wc-consumer-key">Consumer Key</Label>
          <Input
            id="wc-consumer-key"
            placeholder="ck_xxxxxxxxxxxxxxxxxxxxx"
            value={consumerKey}
            onChange={(e) => setConsumerKey(e.target.value)}
            disabled={isConnected}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wc-consumer-secret">Consumer Secret</Label>
          <Input
            id="wc-consumer-secret"
            type="password"
            placeholder="cs_xxxxxxxxxxxxxxxxxxxxx"
            value={consumerSecret}
            onChange={(e) => setConsumerSecret(e.target.value)}
            disabled={isConnected}
          />
          <p className="text-xs text-muted-foreground">
            Generate API credentials in WooCommerce → Settings → Advanced → REST API
          </p>
        </div>

        <div className="flex gap-2">
          {!isConnected ? (
            <>
              <Button onClick={handleTest} disabled={isTesting} variant="outline">
                {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Test Connection
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Connection
              </Button>
            </>
          ) : (
            <Button onClick={handleDisconnect} variant="destructive">
              Disconnect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

