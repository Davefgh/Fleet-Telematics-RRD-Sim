import type { ReactNode } from 'react';

interface PanelProps {
    title: string;
    badge?: string;
    badgeColor?: string;
    children: ReactNode;
    className?: string;
}

export function Panel({ title, badge, badgeColor, children, className = '' }: PanelProps) {
    return (
        <div className={`panel ${className}`}>
            <div className="panel-header">
                <h3 className="panel-title">{title}</h3>
                {badge && (
                    <span
                        className="panel-badge"
                        style={badgeColor ? { color: badgeColor } : undefined}
                    >
                        {badge}
                    </span>
                )}
            </div>
            <div className="panel-content">
                {children}
            </div>
        </div>
    );
}
