"use client"; // Wajib di Next.js App Router jika menggunakan fitur React (useState/useEffect)

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function DashboardAIRIS() {
  const [dataClustering, setDataClustering] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Memanggil API FastAPI yang sudah kita buat
    fetch("http://127.0.0.1:8000/clustering-beban-mingguan")
      .then((res) => res.json())
      .then((data) => {
        // Menyimpan array "data_clustering" dari JSON ke dalam state React
        setDataClustering(data.data_clustering);
        setLoading(false);
      })
      .catch((error) => console.error("Gagal mengambil data:", error));
  }, []);

  if (loading) return <div className="p-10 text-xl font-bold">A.I.R.I.S sedang memuat data AI...</div>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">A.I.R.I.S - Analisis Beban Kerja Mingguan</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Total Work Order per Organisasi (Cluster AI)</h2>
        
        {/* Tempat Grafik Recharts Berada */}
        <div className="h-96 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataClustering} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              {/* Sumbu X menampilkan nama Maint. Org. dan Minggu */}
              <XAxis dataKey={(row) => `${row["Maint. Org."]} (W${row.ISO_Week})`} />
              <YAxis />
              <Tooltip />
              <Legend />
              {/* Batang grafik menampilkan Total WO */}
              <Bar dataKey="Total_WO" fill="#3b82f6" name="Total Work Order" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Cluster" fill="#ef4444" name="Level Beban (Cluster)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}