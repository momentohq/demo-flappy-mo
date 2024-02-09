'use client'
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login () {
  const [username, setUsername] = useState('');
  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage?.setItem('username', username);
    router.push('/');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <form onSubmit={handleSubmit} className="bg-white p-5 rounded-lg flex flex-col gap-3 w-full max-w-md">
        <label htmlFor="username" className="font-semibold text-black">Enter Your Username</label>
        <input
          type="text"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="p-2 border border-gray-300 rounded-md text-black"
        />
        <button type="submit" className="p-2 bg-green-500 text-white rounded-md hover:bg-green-700 transition-colors">
          Let's Play
        </button>
      </form>
    </div>
  );
};
