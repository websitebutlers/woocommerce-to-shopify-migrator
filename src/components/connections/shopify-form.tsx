"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ShopifyFormProps {
  isConnected: boolean;
  onConnectionChange: () => void;
}

export function ShopifyForm({ isConnected, onConnectionChange }: ShopifyFormProps) {
  const [storeDomain, setStoreDomain] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleTest = async () => {
    if (!storeDomain || !accessToken) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch('/api/shopify/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeDomain, accessToken }),
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
    if (!storeDomain || !accessToken) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/shopify/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeDomain, accessToken }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Shopify connected successfully!');
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
      const response = await fetch('/api/shopify/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Shopify disconnected');
        setStoreDomain('');
        setAccessToken('');
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
            <CardTitle>Shopify Connection</CardTitle>
            <CardDescription>
              Connect your Shopify store using Admin API credentials
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
          <Label htmlFor="shopify-domain">Store Domain</Label>
          <Input
            id="shopify-domain"
            placeholder="your-store.myshopify.com"
            value={storeDomain}
            onChange={(e) => setStoreDomain(e.target.value)}
            disabled={isConnected}
          />
          <p className="text-xs text-muted-foreground">
            Your Shopify store domain (e.g., example.myshopify.com)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="shopify-token">Admin API Access Token</Label>
          <Input
            id="shopify-token"
            type="password"
            placeholder="shpat_xxxxxxxxxxxxxxxxxxxxx"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            disabled={isConnected}
          />
          <p className="text-xs text-muted-foreground">
            Create a custom app in Shopify Admin → Apps → Develop apps
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

