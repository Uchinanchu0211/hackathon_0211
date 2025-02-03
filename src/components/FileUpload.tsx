import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Camera } from 'lucide-react';

interface FileUploadProps {
  onUpload: (files: File[]) => void;
}

export function FileUpload({ onUpload }: FileUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onUpload(acceptedFiles);
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    noClick: true // デスクトップでもモバイルでもクリックでファイル選択ダイアログを開かないようにする
  });

  return (
    <div className="space-y-4">
      {/* モバイル向けUI */}
      <div className="md:hidden">
        <button
          onClick={open}
          className="w-full flex flex-col items-center justify-center p-6 bg-blue-50 rounded-lg border-2 border-blue-200 hover:bg-blue-100 transition-colors"
        >
          <Camera className="w-12 h-12 mb-4 text-blue-500" />
          <p className="text-lg font-medium text-blue-700">
            写真を選択
          </p>
          <p className="text-sm text-blue-600">
            ライブラリから領収書の写真を選択
          </p>
        </button>
      </div>

      {/* デスクトップ向けUI */}
      <div
        {...getRootProps()}
        className="hidden md:block p-8 border-2 border-dashed rounded-lg transition-colors cursor-pointer
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}"
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center text-gray-600">
          <Upload className="w-12 h-12 mb-4" />
          <p className="text-lg font-medium mb-2">
            {isDragActive ? 'ドロップしてアップロード' : '領収書をドラッグ＆ドロップ'}
          </p>
          <button
            onClick={open}
            className="text-sm text-blue-500 hover:text-blue-700 underline"
          >
            または、クリックして選択
          </button>
        </div>
      </div>
    </div>
  );
}