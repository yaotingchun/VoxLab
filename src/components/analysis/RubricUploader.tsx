"use client";

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface RubricData {
    topic: string;
    gradingCriteria: {
        criterion: string;
        description: string;
        weight?: number;
    }[];
}

interface RubricUploaderProps {
    onRubricParsed: (rubric: RubricData) => void;
}

export function RubricUploader({ onRubricParsed }: RubricUploaderProps) {
    const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [file, setFile] = useState<File | null>(null);
    const [errorMessage, setErrorMessage] = useState('');

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        const selectedFile = acceptedFiles[0];
        setFile(selectedFile);
        setStatus('uploading');
        setErrorMessage('');

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await fetch('/api/practice/parse-rubric', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to parse rubric');
            }

            setStatus('success');
            onRubricParsed(data.data);

        } catch (error: any) {
            console.error(error);
            setStatus('error');
            setErrorMessage(error.message || 'An unexpected error occurred.');
            setFile(null);
        }
    }, [onRubricParsed]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
        },
        maxFiles: 1,
    });

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                Speech Rubric (Optional)
            </h3>

            {status === 'idle' && (
                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
                        ${isDragActive ? 'border-purple-500 bg-purple-500/10' : 'border-gray-600 hover:border-gray-500'}
                    `}
                >
                    <input {...getInputProps()} />
                    <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-300">Upload a PDF Rubric to grade against</p>
                </div>
            )}

            {status === 'uploading' && (
                <div className="flex items-center gap-3 text-purple-400 bg-purple-500/10 p-4 rounded-lg">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-medium">Extracting criteria with AI...</span>
                </div>
            )}

            {status === 'success' && file && (
                <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <div>
                            <p className="text-white text-sm font-medium">{file.name}</p>
                            <p className="text-green-400 text-xs">Rubric successfully extracted</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white"
                        onClick={() => {
                            setFile(null);
                            setStatus('idle');
                        }}
                    >
                        Change
                    </Button>
                </div>
            )}

            {status === 'error' && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
                    <p className="text-sm text-red-400">{errorMessage}</p>
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 text-xs"
                        onClick={() => setStatus('idle')}
                    >
                        Try Again
                    </Button>
                </div>
            )}
        </div>
    );
}
