'use client';

import { Button } from '@/components/ui/button';
import { Delete, Eraser, Loader2 } from 'lucide-react';

interface SmartNumpadProps {
    onInput: (value: string) => void;
    onDelete: () => void;
    onClear: () => void;
    onEnter?: () => void;
    value: string;
    isProcessing?: boolean;
}

export function SmartNumpad({ onInput, onDelete, onClear, onEnter, value, isProcessing = false }: SmartNumpadProps) {
    const buttons = [
        '1', '2', '3',
        '4', '5', '6',
        '7', '8', '9',
        '00', '0', '000'
    ];

    return (
        <div className="grid grid-cols-3 gap-2 h-full">
            {buttons.map((btn) => (
                <Button
                    key={btn}
                    variant="outline"
                    className="h-14 text-xl font-mono font-bold hover:bg-black hover:text-white transition-colors dark:hover:bg-white dark:hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => onInput(btn)}
                    disabled={isProcessing}
                >
                    {btn}
                </Button>
            ))}
            <Button 
                variant="destructive" 
                className="h-14 disabled:opacity-50 disabled:cursor-not-allowed" 
                onClick={onClear}
                disabled={isProcessing}
            >
                <Eraser className="w-6 h-6" />
            </Button>
            <Button 
                variant="secondary" 
                className="h-14 disabled:opacity-50 disabled:cursor-not-allowed" 
                onClick={onDelete}
                disabled={isProcessing}
            >
                <Delete className="w-6 h-6" />
            </Button>
            {onEnter && (
                <Button 
                    className="h-14 bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2" 
                    onClick={onEnter}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm">Processing</span>
                        </>
                    ) : (
                        'Enter'
                    )}
                </Button>
            )}
        </div>
    );
}
