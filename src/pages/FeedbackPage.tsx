import React from 'react';
import FeedbackForm from '../components/FeedbackForm';

export default function FeedbackPage() {
  return (
    <div className="min-h-screen bg-green-50 p-6">
      <div className="max-w-3xl mx-auto mt-10">
        <FeedbackForm />
      </div>
    </div>
  );
}
