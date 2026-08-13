"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import useGatewaySocket from "@/hooks/useGatewaySocket";

export default function NetworkProfilesPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadProfiles = async () => {
    try {
      const res = await api.get("/network-profiles");
      setProfiles(res.data.profiles || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  useGatewaySocket({
    "network-profile-updated": loadProfiles,
  });

  if (loading) {
    return (
      <div className="p-6">
        Loading...
      </div>
    );
  }

  return (
    <div className="p-6">

      <h1 className="text-3xl font-bold mb-6">
        Network Profiles
      </h1>

      <div className="overflow-auto rounded-xl border">

        <table className="w-full">

          <thead className="bg-slate-900 text-white">

            <tr>
              <th className="p-3 text-left">Network</th>
              <th className="p-3 text-left">Default SIM</th>
              <th className="p-3 text-left">Airtime USSD</th>
              <th className="p-3 text-left">Data Balance</th>
              <th className="p-3 text-left">Status</th>
            </tr>

          </thead>

          <tbody>

            {profiles.map((profile) => (

              <tr
                key={profile.id}
                className="border-t"
              >

                <td className="p-3">
                  {profile.network}
                </td>

                <td className="p-3">
                  SIM {profile.defaultSimSlot + 1}
                </td>

                <td className="p-3">
                  {profile.airtimeTemplate}
                </td>

                <td className="p-3">
                  {profile.dataBalanceUssd}
                </td>

                <td className="p-3">

                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      profile.enabled
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {profile.enabled ? "Enabled" : "Disabled"}
                  </span>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}