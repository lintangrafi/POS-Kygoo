'use client';

import { useActionState } from 'react';
import { loginAction } from '@/actions/auth-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
    const [state, action, isPending] = useActionState(loginAction, null);

    return (
        <div className="flex min-h-[100dvh] items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md border-border/60 shadow-lg bg-card text-card-foreground">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto bg-primary text-primary-foreground w-12 h-12 flex items-center justify-center font-bold text-xl mb-2 rounded-sm transform rotate-3">
                        K
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">Kygoo Studio</CardTitle>
                    <CardDescription>Enter your credentials to access the POS</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={action} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="user@kygoo.studio"
                                required
                                className="bg-card text-card-foreground"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="bg-card text-card-foreground"
                            />
                        </div>

                        {state?.error && (
                            <div className="text-sm text-destructive font-medium text-center bg-destructive/10 p-2 rounded border border-destructive/20">
                                {state.error}
                            </div>
                        )}

                        <Button type="submit" className="w-full font-semibold" disabled={isPending}>
                            {isPending ? 'Authenticating...' : 'Sign In'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
