'use client';

import { useState, useCallback, useEffect } from 'react';

interface UseIconReturn {
    iconUrl: string | null;
    isLoading: boolean;
}

export function usePackIcon(iconBlob: Blob | undefined): UseIconReturn {
    const [iconUrl, setIconUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (iconBlob) {
            const url = URL.createObjectURL(iconBlob);
            setIconUrl(url);
            setIsLoading(false);

            // Cleanup on unmount
            return () => {
                URL.revokeObjectURL(url);
            };
        } else {
            setIsLoading(false);
        }
    }, [iconBlob]);

    return { iconUrl, isLoading };
}

interface DragDropState {
    isDragging: boolean;
}

interface UseDragDropReturn extends DragDropState {
    handleDragEnter: (e: React.DragEvent) => void;
    handleDragLeave: (e: React.DragEvent) => void;
    handleDragOver: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent, onFileDrop: (file: File) => void) => void;
}

export function useDragDrop(): UseDragDropReturn {
    const [isDragging, setIsDragging] = useState(false);
    const [dragCounter, setDragCounter] = useState(0);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragCounter(prev => prev + 1);

        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragCounter(prev => {
            const newCount = prev - 1;
            if (newCount === 0) {
                setIsDragging(false);
            }
            return newCount;
        });
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, onFileDrop: (file: File) => void) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        setDragCounter(0);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            onFileDrop(file);
            e.dataTransfer.clearData();
        }
    }, []);

    return {
        isDragging,
        handleDragEnter,
        handleDragLeave,
        handleDragOver,
        handleDrop
    };
}
