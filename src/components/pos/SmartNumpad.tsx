'use client';

import { Button } from '@/components/ui/button';
import { Delete, Eraser } from 'lucide-react';

interface SmartNumpadProps {
    onInput: (value: string) => void;
    onDelete: () => void;
    onClear: () => void;
    onEnter?: () => void;
    value: string;
}

export function SmartNumpad({ onInput, onDelete, onClear, onEnter, value }: SmartNumpadProps) {
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
                    className="h-14 text-xl font-mono font-bold hover:bg-black hover:text-white transition-colors dark:hover:bg-white dark:hover:text-black"
                    onClick={() => onInput(btn)}
                >
                    {btn}
                </Button>
            ))}
            <Button variant="destructive" className="h-14" onClick={onClear}>
                <Eraser className="w-6 h-6" />
            </Button>
            <Button variant="secondary" className="h-14" onClick={onDelete}>
                <Delete className="w-6 h-6" />
            </Button>
            {onEnter && (
                <Button className="h-14 bg-green-600 hover:bg-green-700 text-white" onClick={onEnter}>
                    Enter
                </Button>
            )}
        </div>
    );
}
