// Primitiva de botón estilo Shadcn/UI (new-york) para el feature `gds`.
// Vive dentro de la feature para no colisionar con la migración global de UI.
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                default: 'bg-cyan-600 text-white hover:bg-cyan-700',
                destructive: 'bg-red-600 text-white hover:bg-red-700',
                outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100',
                ghost: 'text-slate-700 hover:bg-slate-100',
            },
            size: {
                default: 'h-9 px-4 py-2',
                sm: 'h-8 rounded-md px-3 text-xs',
                icon: 'h-9 w-9',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, type = 'button', ...props }, ref) => (
        <button
            ref={ref}
            type={type}
            className={cn(buttonVariants({ variant, size }), className)}
            {...props}
        />
    ),
);
Button.displayName = 'Button';

export { buttonVariants };
