'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, Check } from 'lucide-react'
import { UploadButton } from './upload-button'

export function FileUpload({ onUpload, mealCount, setDietaryData }: { onUpload: (file: File) => void, mealCount: number, setDietaryData: any }) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)

  const handleFileChange = (files: File[]) => {
    if (files && files[0]) {
      setFile(files[0]);
      setUploadComplete(false);
    }
  }

  const handleUpload = () => {
    if (file) {
      setUploading(true)
      const formData = new FormData();
      formData.append('csv_file', file);
      console.log("sending file", file);
      formData.append('count', mealCount.toString());
      fetch('http://localhost:8000/generate-meals-csv', {
        method: 'POST',
        body: formData,
      })
        .then(response => response.json())
        .then(data => {
          setDietaryData(data)
          onUpload(file);
          setUploading(false);
          setUploadComplete(true);
          console.log("Made request ")
        })
        .catch(error => console.error('Error:', error));
    }
  }

  return (
    <div className="space-y-4">
      <Label htmlFor="csvFile" className="text-lg font-semibold">Upload CSV File</Label>
      <div className="flex flex-col items-center space-x-2">
        <UploadButton onChange={handleFileChange} />
        {/* <Input id="csvFile" type="file" accept=".csv" onChange={handleFileChange} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" /> */}
        {file && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Button className="" onClick={handleUpload} disabled={uploading || uploadComplete}>
              {uploading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Upload className="w-5 h-5" />
                </motion.div>
              ) : uploadComplete ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <Upload className="w-5 h-5" />
              )}
              <span className="ml-2">{uploading ? 'Uploading...' : uploadComplete ? 'Uploaded' : 'Upload'}</span>
            </Button>
          </motion.div>
        )}
      </div>
      {file && !uploading && !uploadComplete && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 0.5 }}
          className="h-2 bg-violet-500 rounded-full"
        />
      )}
      {uploading && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 2 }}
          className="h-2 bg-violet-500 rounded-full"
        />
      )}
    </div>
  )
}

