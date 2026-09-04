"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Code2,
  Copy,
  Database,
  FileCode2,
  Globe2,
  KeyRound,
  Layers3,
  LockKeyhole,
  Menu,
  SearchCheck,
  Server,
  ShieldCheck,
  Smartphone,
  UserCheck,
  Wallet,
  Wifi,
  X,
  Zap,
} from "lucide-react";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://api.ayaxdigital.solutions";

const documentationLinks = [
  {
    id: "overview",
    label: "Overview",
    icon: Globe2,
  },
  {
    id: "environments",
    label: "Environments",
    icon: Server,
  },
  {
    id: "authentication",
    label: "Authentication",
    icon: KeyRound,
  },
  {
    id: "wallet",
    label: "Wallet",
    icon: Wallet,
  },
  {
    id: "endpoints",
    label: "Endpoints",
    icon: Code2,
  },
  {
    id: "responses",
    label: "Response Format",
    icon: ClipboardCheck,
  },
  {
    id: "errors",
    label: "Error Codes",
    icon: AlertCircle,
  },
];

const services = [
  {
    icon: Wifi,
    title: "Data API",
    description:
      "Purchase internet data bundles for supported mobile networks.",
  },
  {
    icon: Smartphone,
    title: "Airtime API",
    description:
      "Send airtime top-up to supported mobile phone numbers.",
  },
  {
    icon: Zap,
    title: "Electricity API",
    description:
      "Validate meter numbers and purchase electricity tokens.",
  },
  {
    icon: Layers3,
    title: "Cable API",
    description:
      "Validate smartcard details and renew television subscriptions.",
  },
  {
    icon: ShieldCheck,
    title: "NIMC (NIN) API",
    description:
      "Verify National Identity Numbers, download slip profiles, and resolve validation issues.",
  },
  {
    icon: UserCheck,
    title: "BVN API",
    description:
      "Access instant Bank Verification Number (BVN) validation and KYC matching.",
  },
  {
    icon: Database,
    title: "Transaction API",
    description:
      "Track transaction status using your unique reference.",
  },
];

const endpoints = [
  {
    id: "data-plans",
    category: "Data API",
    method: "GET",
    path: "/api/v1/data/plans",
    title: "Get Data Plans",
    description:
      "Retrieve active data plans available to your developer account.",
    request: `No request body is required.`,
    response: `{
  "success": true,
  "message": "Data plans retrieved successfully",
  "data": [
    {
      "id": "plan_1gb_mtn",
      "network": "MTN",
      "name": "1GB",
      "validity": "30 Days",
      "amount": 500,
      "currency": "NGN"
    }
  ]
}`,
  },
  {
    id: "buy-data",
    category: "Data API",
    method: "POST",
    path: "/api/v1/data/buy",
    title: "Purchase Data",
    description:
      "Purchase a data bundle using an active plan ID and unique reference.",
    request: `{
  "network": "MTN",
  "phone": "08012345678",
  "planId": "plan_1gb_mtn",
  "reference": "AYAX-2026-0001"
}`,
    response: `{
  "success": true,
  "message": "Data transaction submitted successfully",
  "data": {
    "reference": "AYAX-2026-0001",
    "status": "PROCESSING",
    "network": "MTN",
    "phone": "08012345678",
    "amount": 500
  }
}`,
  },
  {
    id: "buy-airtime",
    category: "Airtime API",
    method: "POST",
    path: "/api/v1/airtime/buy",
    title: "Purchase Airtime",
    description:
      "Send airtime to a supported mobile network phone number.",
    request: `{
  "network": "AIRTEL",
  "phone": "08012345678",
  "amount": 500,
  "reference": "AYAX-2026-0002"
}`,
    response: `{
  "success": true,
  "message": "Airtime transaction submitted successfully",
  "data": {
    "reference": "AYAX-2026-0002",
    "status": "PROCESSING",
    "network": "AIRTEL",
    "phone": "08012345678",
    "amount": 500
  }
}`,
  },
  {
    id: "validate-meter",
    category: "Electricity API",
    method: "POST",
    path: "/api/v1/electricity/validate",
    title: "Validate Meter",
    description:
      "Validate a meter number before purchasing an electricity token.",
    request: `{
  "provider": "AEDC",
  "meterNumber": "12345678901",
  "meterType": "PREPAID"
}`,
    response: `{
  "success": true,
  "message": "Meter validated successfully",
  "data": {
    "customerName": "JOHN DOE",
    "meterNumber": "12345678901",
    "meterType": "PREPAID",
    "provider": "AEDC"
  }
}`,
  },
  {
    id: "buy-electricity",
    category: "Electricity API",
    method: "POST",
    path: "/api/v1/electricity/buy",
    title: "Purchase Electricity",
    description:
      "Purchase an electricity token for a validated meter number.",
    request: `{
  "provider": "AEDC",
  "meterNumber": "12345678901",
  "meterType": "PREPAID",
  "amount": 5000,
  "phone": "08012345678",
  "reference": "AYAX-2026-0003"
}`,
    response: `{
  "success": true,
  "message": "Electricity transaction submitted successfully",
  "data": {
    "reference": "AYAX-2026-0003",
    "status": "PROCESSING",
    "token": null
  }
}`,
  },
  {
    id: "validate-cable",
    category: "Cable API",
    method: "POST",
    path: "/api/v1/cable/validate",
    title: "Validate Smartcard",
    description:
      "Validate a cable television smartcard or IUC number.",
    request: `{
  "provider": "DSTV",
  "smartcardNumber": "1234567890"
}`,
    response: `{
  "success": true,
  "message": "Smartcard validated successfully",
  "data": {
    "customerName": "JOHN DOE",
    "smartcardNumber": "1234567890",
    "provider": "DSTV"
  }
}`,
  },
  {
    id: "verify-nin",
    category: "NIMC (NIN) API",
    method: "POST",
    path: "/api/v1/identity/nin/verify",
    title: "NIN Verification (Lookup & Slip Data)",
    description:
      "Verify an 11-digit NIN and generate slips. Supported slipType: 'Standard Slip', 'Regular Slip', 'Premium Slip', 'VNIN Slip'.",
    request: `{
  "nin": "12345678901",
  "slipType": "Standard Slip",
  "reference": "AYAX-NIN-0001"
}`,
    response: `{
  "status": "success",
  "code": "VERIFICATION_SUCCESSFUL",
  "message": "NIN verified successfully.",
  "data": {
    "reference": "AYAX-NIN-0001",
    "nin": "12345678901",
    "slipType": "Standard Slip",
    "details": {
      "firstName": "IBRAHIM",
      "surname": "MUSA",
      "middleName": "GARBA",
      "phone": "08012345678",
      "gender": "Male",
      "dob": "1995-04-12",
      "photo": "data:image/jpeg;base64,...",
      "address": "No 12 Airport Road, Kano State",
      "trackingId": "TID99812451",
      "slipUrl": "https://abjiktech.com.ng/slips/download/std_123.pdf"
    },
    "amountCharged": 100,
    "walletBalance": 45200
  }
}`,
  },
  {
    id: "verify-nin-phone",
    category: "NIMC (NIN) API",
    method: "POST",
    path: "/api/v1/identity/nin/verify-phone",
    title: "NIN Lookup by Phone Number",
    description:
      "Look up NIN profile details and generate slips using an 11-digit linked mobile phone number. Supported slipType: 'Standard Slip', 'Regular Slip', 'Premium Slip', 'VNIN Slip'.",
    request: `{
  "phone": "08012345678",
  "slipType": "Standard Slip",
  "reference": "AYAX-PHN-0001"
}`,
    response: `{
  "status": "success",
  "code": "VERIFICATION_SUCCESSFUL",
  "message": "NIN phone lookup completed successfully.",
  "data": {
    "reference": "AYAX-PHN-0001",
    "phone": "08012345678",
    "slipType": "Standard Slip",
    "details": {
      "nin": "12345678901",
      "firstName": "IBRAHIM",
      "surname": "MUSA",
      "middleName": "GARBA",
      "gender": "Male",
      "dob": "1995-04-12",
      "photo": "data:image/jpeg;base64,...",
      "address": "No 12 Airport Road, Kano State",
      "slipUrl": "https://abjiktech.com.ng/slips/download/phn_123.pdf"
    },
    "amountCharged": 100,
    "walletBalance": 45100
  }
}`,
  },
  {
    id: "validate-nin-issue",
    category: "NIMC (NIN) API",
    method: "POST",
    path: "/api/v1/identity/nin/validate",
    title: "Submit NIN Validation (Issue Clearance)",
    description:
      "Submit an issue resolution request for manual processing. Allowed errorType values: 'no_record', 'simbank_validation', 'modification', 'photo_error'.",
    request: `{
  "nin": "12345678901",
  "errorType": "no_record",
  "reference": "AYAX-VAL-0001"
}`,
    response: `{
  "status": "success",
  "code": "VALIDATION_QUEUED",
  "message": "NIN validation request submitted successfully. Your request is now pending processing.",
  "data": {
    "reference": "AYAX-VAL-0001",
    "nin": "12345678901",
    "errorType": "no_record",
    "ticketId": "TKT17100000001234",
    "transactionId": "nin_val_a1b2c3d4e5f6g7h8",
    "status": "pending",
    "amountCharged": 500,
    "walletBalance": 44600
  }
}`,
  },
  {
    id: "check-validation-status",
    category: "NIMC (NIN) API",
    method: "POST",
    path: "/api/v1/identity/nin/validate/status",
    title: "Check NIN Validation Status",
    description:
      "Query the real-time status of a submitted NIN validation using either ticketId or transactionId.",
    request: `{
  "ticketId": "TKT17100000001234"
}`,
    response: `{
  "success": true,
  "data": {
    "ticket_id": "TKT17100000001234",
    "transaction_id": "nin_val_a1b2c3d4e5f6g7h8",
    "nin": "12345678901",
    "error_type": "no_record",
    "status": "success",
    "submitted_at": "2026-09-04 10:30:00",
    "message": "Your NIN validation has been completed successfully."
  }
}`,
  },
  {
    id: "submit-ipe-clearance",
    category: "NIMC (NIN) API",
    method: "POST",
    path: "/api/v1/identity/ipe/submit",
    title: "Submit IPE Clearance",
    description:
      "Submit an enrolment tracking ID (1-20 alphanumeric characters) for Identity Protection Eligibility (IPE) clearance.",
    request: `{
  "trackingID": "IPE202600001",
  "reference": "AYAX-IPE-0001"
}`,
    response: `{
  "status": "success",
  "code": "IPE_SUBMITTED",
  "message": "IPE clearance submitted for manual processing.",
  "data": {
    "reference": "AYAX-IPE-0001",
    "trackingID": "IPE202600001",
    "result": {
      "transaction_id": "ipe_tx_99881122",
      "status": "pending"
    },
    "amountCharged": 2000,
    "walletBalance": 42600
  }
}`,
  },
  {
    id: "check-ipe-status",
    category: "NIMC (NIN) API",
    method: "POST",
    path: "/api/v1/identity/ipe/status",
    title: "Check IPE Clearance Status",
    description:
      "Track the progress of a previously submitted IPE clearance request using its trackingID.",
    request: `{
  "trackingID": "IPE202600001"
}`,
    response: `{
  "success": true,
  "status": "completed",
  "nin": "12345678901",
  "tracking_id": "IPE202600001",
  "message": "IPE clearance completed successfully."
}`,
  },
  {
    id: "submit-personalization",
    category: "NIMC (NIN) API",
    method: "POST",
    path: "/api/v1/identity/personalization/submit",
    title: "Submit NIN Personalization",
    description:
      "Submit a NIN personalization request using a unique 15-character NIN tracking ID.",
    request: `{
  "trackingId": "0S123456789ABCD",
  "reference": "AYAX-PERS-0001"
}`,
    response: `{
  "status": "success",
  "code": "PERSONALIZATION_QUEUED",
  "message": "Personalization submitted successfully.",
  "data": {
    "reference": "AYAX-PERS-0001",
    "trackingId": "0S123456789ABCD",
    "result": {
      "status": "inprogress"
    },
    "amountCharged": 1200,
    "walletBalance": 41400
  }
}`,
  },
  {
    id: "check-personalization-status",
    category: "NIMC (NIN) API",
    method: "POST",
    path: "/api/v1/identity/personalization/status",
    title: "Check Personalization Status",
    description:
      "Poll the status of an ongoing NIN personalization request using the trackingId.",
    request: `{
  "trackingId": "0S123456789ABCD"
}`,
    response: `{
  "success": true,
  "status": "completed",
  "nin": "12345678901",
  "tracking_id": "0S123456789ABCD",
  "message": "Personalization successful."
}`,
  },
  {
    id: "verify-bvn",
    category: "BVN API",
    method: "POST",
    path: "/api/v1/identity/bvn/verify",
    title: "BVN Verification",
    description:
      "Query Bank Verification Number (BVN) to validate identity, date of birth, photo, and banking profile data. Supported slipType: 'Standard Slip', 'Premium Slip'.",
    request: `{
  "bvn": "22233344455",
  "slipType": "Standard Slip",
  "reference": "AYAX-BVN-0001"
}`,
    response: `{
  "status": "success",
  "code": "VERIFICATION_SUCCESSFUL",
  "message": "BVN verified successfully.",
  "data": {
    "reference": "AYAX-BVN-0001",
    "bvn": "22233344455",
    "slipType": "Standard Slip",
    "details": {
      "firstName": "FATIMA",
      "surname": "AHMAD",
      "middleName": "BELLO",
      "phone": "09087654321",
      "gender": "Female",
      "dob": "1998-11-20",
      "photo": "data:image/jpeg;base64,...",
      "slipUrl": "https://abjiktech.com.ng/slips/download/bvn_std_222.pdf"
    },
    "amountCharged": 70,
    "walletBalance": 41330
  }
}`,
  },
  {
    id: "transaction-status",
    category: "Transaction API",
    method: "GET",
    path: "/api/v1/transactions/:reference",
    title: "Transaction Status",
    description:
      "Retrieve the latest state of a transaction using its reference.",
    request: `GET /api/v1/transactions/AYAX-2026-0001`,
    response: `{
  "success": true,
  "message": "Transaction retrieved successfully",
  "data": {
    "reference": "AYAX-2026-0001",
    "status": "SUCCESSFUL",
    "service": "DATA",
    "amount": 500,
    "createdAt": "2026-07-22T10:30:00.000Z"
  }
}`,
  },
];

const errorCodes = [
  {
    code: "400",
    title: "Bad Request",
    description:
      "The request body or one of the supplied parameters is invalid.",
  },
  {
    code: "401",
    title: "Unauthorized",
    description:
      "The API key is missing, invalid, revoked or expired.",
  },
  {
    code: "403",
    title: "Forbidden",
    description:
      "The API key does not have permission to use the requested service.",
  },
  {
    code: "404",
    title: "Not Found",
    description:
      "The requested transaction, plan or API resource was not found.",
  },
  {
    code: "409",
    title: "Duplicate Reference",
    description:
      "The transaction reference has already been used.",
  },
  {
    code: "422",
    title: "Validation Error",
    description:
      "The submitted request failed one or more validation rules.",
  },
  {
    code: "429",
    title: "Rate Limit Exceeded",
    description:
      "The API key has exceeded its allowed request limit.",
  },
  {
    code: "500",
    title: "Server Error",
    description:
      "The request could not be completed because of a server error.",
  },
];

const methodStyles = {
  GET: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  POST: "border-green-500/30 bg-green-500/10 text-green-300",
  PUT: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  PATCH: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  DELETE: "border-red-500/30 bg-red-500/10 text-red-300",
};

const getCurlExample = (endpoint) => {
  const url = `${BASE_URL}${endpoint.path}`;

  if (endpoint.method === "GET") {
    return `curl --request GET \\
  --url "${url}" \\
  --header "accept: application/json" \\
  --header "x-api-key: ayax_live_your_api_key_here"`;
  }

  return `curl --request ${endpoint.method} \\
  --url "${url}" \\
  --header "accept: application/json" \\
  --header "content-type: application/json" \\
  --header "x-api-key: ayax_live_your_api_key_here" \\
  --data '${endpoint.request}'`;
};

const getNodeExample = (endpoint) => {
  const url = `${BASE_URL}${endpoint.path}`;

  if (endpoint.method === "GET") {
    return `const response = await fetch(
  "${url}",
  {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-api-key": "ayax_live_your_api_key_here",
    },
  }
);

const result = await response.json();

console.log(result);`;
  }

  return `const response = await fetch(
  "${url}",
  {
    method: "${endpoint.method}",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-api-key": "ayax_live_your_api_key_here",
    },
    body: JSON.stringify(${endpoint.request}),
  }
);

const result = await response.json();

console.log(result);`;
};

export default function DocsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedEndpoints, setExpandedEndpoints] = useState({});
  const [codeTabs, setCodeTabs] = useState({});
  const [copiedValue, setCopiedValue] = useState("");

  const endpointCount = useMemo(
    () => endpoints.length,
    []
  );

  const toggleEndpoint = (endpointId) => {
    setExpandedEndpoints((current) => ({
      ...current,
      [endpointId]: !current[endpointId],
    }));
  };

  const changeCodeTab = (endpointId, tab) => {
    setCodeTabs((current) => ({
      ...current,
      [endpointId]: tab,
    }));
  };

  const copyText = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(label);

      window.setTimeout(() => {
        setCopiedValue("");
      }, 2000);
    } catch {
      setCopiedValue("");
    }
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-6">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <Image
              src="/assets/logo.png"
              alt="Ayax APIs Logo"
              width={46}
              height={46}
              priority
              className="rounded-xl object-contain"
            />

            <div>
              <h2 className="text-xl font-extrabold">
                Ayax{" "}
                <span className="text-blue-500">
                  APIs
                </span>
              </h2>

              <p className="text-xs text-slate-400">
                Developer Documentation
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            <Link
              href="/marketplace"
              className="text-sm font-medium text-slate-300 hover:text-white"
            >
              API Marketplace
            </Link>

            <Link
              href="/pricing"
              className="text-sm font-medium text-slate-300 hover:text-white"
            >
              Pricing
            </Link>

            <Link
              href="/login"
              className="text-sm font-medium text-slate-300 hover:text-white"
            >
              Login
            </Link>

            <Link
              href="/register"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-700"
            >
              Get API Key
              <ArrowRight size={17} />
            </Link>
          </div>

          <button
            type="button"
            onClick={() =>
              setMobileMenuOpen((current) => !current)
            }
            className="rounded-xl border border-slate-800 bg-slate-900 p-3 md:hidden"
            aria-label="Open navigation menu"
          >
            {mobileMenuOpen ? (
              <X size={21} />
            ) : (
              <Menu size={21} />
            )}
          </button>
        </nav>

        {mobileMenuOpen && (
          <div className="border-t border-slate-800 bg-slate-950 px-5 py-5 md:hidden">
            <div className="space-y-2">
              <MobileNavLink
                href="/marketplace"
                label="API Marketplace"
                onClick={closeMobileMenu}
              />

              <MobileNavLink
                href="/pricing"
                label="Pricing"
                onClick={closeMobileMenu}
              />

              <MobileNavLink
                href="/login"
                label="Login"
                onClick={closeMobileMenu}
              />

              <MobileNavLink
                href="/register"
                label="Get API Key"
                onClick={closeMobileMenu}
                primary
              />
            </div>
          </div>
        )}
      </header>

      <section className="border-b border-slate-800 bg-gradient-to-br from-blue-600/15 via-slate-950 to-slate-950">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:px-6 lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-300">
              <Code2 size={17} />
              Ayax Developer Platform
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Build powerful applications with{" "}
              <span className="text-blue-500">
                Ayax APIs
              </span>
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-400">
              Integrate Data, Airtime, Electricity,
              Cable, NIMC (NIN) Verification, BVN KYC and
              Transaction services into your website,
              mobile application, POS system or reseller
              platform.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-semibold hover:bg-blue-700"
              >
                Start Integration
                <ArrowRight size={18} />
              </Link>

              <a
                href="#endpoints"
                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-6 py-4 font-semibold hover:bg-slate-800"
              >
                Explore Endpoints
                <Code2 size={18} />
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-yellow-400" />
                <span className="h-3 w-3 rounded-full bg-green-400" />
              </div>

              <span className="text-xs text-slate-500">
                Quick Start
              </span>
            </div>

            <pre className="mt-5 overflow-x-auto text-sm leading-7 text-slate-300">
              <code>{`curl --request GET \\
  --url "${BASE_URL}/api/v1/data/plans" \\
  --header "accept: application/json" \\
  --header "x-api-key: ayax_live_your_key"`}</code>
            </pre>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-6">
        <aside className="hidden lg:block">
          <div className="sticky top-28 rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="px-3 text-sm font-bold uppercase tracking-wider text-slate-500">
              Documentation
            </h3>

            <div className="mt-4 space-y-1">
              {documentationLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-blue-300"
                  >
                    <Icon size={17} />
                    {item.label}
                  </a>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
              <ShieldCheck className="text-blue-400" />

              <p className="mt-3 text-sm font-semibold">
                Keep your API key secure
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                Never expose a live secret API key in
                frontend or public source code.
              </p>
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-10">
          <DocSection id="overview">
            <SectionHeading
              icon={<Globe2 />}
              eyebrow="API Overview"
              title="Ayax Developer API"
              description="One secure platform for integrating digital services into your applications."
            />

            <p className="mt-6 max-w-4xl leading-8 text-slate-400">
              Ayax APIs provide standardized endpoints
              that allow developers and businesses to
              integrate supported digital services
              without connecting directly to multiple
              upstream providers.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {services.map((service) => {
                const Icon = service.icon;

                return (
                  <div
                    key={service.title}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                      <Icon size={21} />
                    </div>

                    <h3 className="mt-4 font-bold">
                      {service.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {service.description}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Documented Endpoints"
                value={`${endpointCount}+`}
              />

              <StatCard
                label="Authentication"
                value="API Key"
              />

              <StatCard
                label="Response Format"
                value="JSON"
              />
            </div>
          </DocSection>

          <DocSection id="environments">
            <SectionHeading
              icon={<Server />}
              eyebrow="API Environments"
              title="Sandbox and Production"
              description="Develop safely in Sandbox before moving your application to Production."
            />

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <EnvironmentCard
                title="Sandbox"
                badge="Development"
                description="Use Sandbox credentials while developing and testing your integration."
                baseUrl={`${BASE_URL}/sandbox`}
                keyPrefix="ayax_test_"
              />

              <EnvironmentCard
                title="Production"
                badge="Live"
                description="Use Production credentials only from a secure backend server."
                baseUrl={BASE_URL}
                keyPrefix="ayax_live_"
                production
              />
            </div>
          </DocSection>

          <DocSection id="authentication">
            <SectionHeading
              icon={<LockKeyhole />}
              eyebrow="Authentication"
              title="API Key Authentication"
              description="Every protected request must contain a valid API key."
            />

            <p className="mt-6 leading-8 text-slate-400">
              Send your secret key through the{" "}
              <code className="rounded bg-slate-950 px-2 py-1 text-blue-300">
                x-api-key
              </code>{" "}
              request header. The key determines your
              environment, permissions and applicable
              rate limits.
            </p>

            <CodeBlock
              title="Request Headers"
              value={`x-api-key: ayax_live_your_api_key_here
Content-Type: application/json
Accept: application/json`}
              copiedValue={copiedValue}
              copyLabel="authentication-header"
              onCopy={copyText}
            />

            <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  size={21}
                  className="mt-0.5 shrink-0 text-yellow-300"
                />

                <div>
                  <h3 className="font-bold text-yellow-200">
                    Security warning
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-yellow-100/70">
                    Do not include a secret API key in
                    React, Next.js client components,
                    mobile app source code or any public
                    repository. Route API requests through
                    your protected backend server.
                  </p>
                </div>
              </div>
            </div>
          </DocSection>

          <DocSection id="wallet">
            <SectionHeading
              icon={<Wallet />}
              eyebrow="Wallet System"
              title="Automatic Wallet Deduction"
              description="Your wallet funds successful service transactions."
            />

            <p className="mt-6 leading-8 text-slate-400">
              Each service request is priced according
              to the active API plan assigned to your
              developer account. Ayax verifies your
              wallet balance before submitting a paid
              transaction.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <InfoCard
                icon={<Wallet />}
                title="Wallet Balance"
                text="Fund your developer wallet before sending live paid requests."
              />

              <InfoCard
                icon={<Layers3 />}
                title="Plan Pricing"
                text="The active API plan determines the price charged for each service."
              />

              <InfoCard
                icon={<Activity />}
                title="Transaction History"
                text="Every debit and API transaction is recorded in your dashboard."
              />
            </div>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <p className="text-sm font-semibold text-slate-300">
                Important
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Balance validation, service price and
                wallet deduction are managed by the Ayax
                backend. Never calculate or deduct wallet
                funds from frontend code.
              </p>
            </div>
          </DocSection>

          <section
            id="endpoints"
            className="scroll-mt-28 space-y-6"
          >
            <SectionHeading
              icon={<Code2 />}
              eyebrow="API Reference"
              title="Available Endpoints"
              description="Review request parameters, responses and integration examples."
            />

            {endpoints.map((endpoint) => {
              const expanded =
                expandedEndpoints[endpoint.id];

              const selectedTab =
                codeTabs[endpoint.id] || "request";

              return (
                <article
                  key={endpoint.id}
                  className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900"
                >
                  <div className="p-6 lg:p-8">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
                            {endpoint.category}
                          </span>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-bold ${
                              methodStyles[endpoint.method]
                            }`}
                          >
                            {endpoint.method}
                          </span>
                        </div>

                        <h3 className="mt-4 text-2xl font-bold">
                          {endpoint.title}
                        </h3>

                        <p className="mt-3 max-w-3xl leading-7 text-slate-400">
                          {endpoint.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          copyText(
                            `${endpoint.method} ${endpoint.path}`,
                            `endpoint-${endpoint.id}`
                          )
                        }
                        className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 font-mono text-sm"
                      >
                        <span
                          className={
                            endpoint.method === "GET"
                              ? "text-blue-400"
                              : "text-green-400"
                          }
                        >
                          {endpoint.method}
                        </span>

                        <span className="min-w-0 break-all text-slate-300">
                          {endpoint.path}
                        </span>

                        {copiedValue ===
                        `endpoint-${endpoint.id}` ? (
                          <CheckCircle2
                            size={17}
                            className="shrink-0 text-green-400"
                          />
                        ) : (
                          <Copy
                            size={17}
                            className="shrink-0 text-slate-500"
                          />
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        toggleEndpoint(endpoint.id)
                      }
                      className="mt-6 flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4 text-left font-semibold hover:bg-slate-800"
                    >
                      <span>
                        {expanded
                          ? "Hide documentation"
                          : "View request and response"}
                      </span>

                      {expanded ? (
                        <ChevronUp size={19} />
                      ) : (
                        <ChevronDown size={19} />
                      )}
                    </button>
                  </div>

                  {expanded && (
                    <div className="border-t border-slate-800 bg-slate-950/40 p-6 lg:p-8">
                      <div className="flex flex-wrap gap-2">
                        <CodeTab
                          label="Request"
                          active={
                            selectedTab === "request"
                          }
                          onClick={() =>
                            changeCodeTab(
                              endpoint.id,
                              "request"
                            )
                          }
                        />

                        <CodeTab
                          label="Response"
                          active={
                            selectedTab === "response"
                          }
                          onClick={() =>
                            changeCodeTab(
                              endpoint.id,
                              "response"
                            )
                          }
                        />

                        <CodeTab
                          label="cURL"
                          active={
                            selectedTab === "curl"
                          }
                          onClick={() =>
                            changeCodeTab(
                              endpoint.id,
                              "curl"
                            )
                          }
                        />

                        <CodeTab
                          label="Node.js"
                          active={
                            selectedTab === "node"
                          }
                          onClick={() =>
                            changeCodeTab(
                              endpoint.id,
                              "node"
                            )
                          }
                        />
                      </div>

                      <EndpointCodePanel
                        endpoint={endpoint}
                        selectedTab={selectedTab}
                        copiedValue={copiedValue}
                        onCopy={copyText}
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </section>

          <DocSection id="responses">
            <SectionHeading
              icon={<ClipboardCheck />}
              eyebrow="Response Format"
              title="Standard JSON Response"
              description="Ayax APIs use a predictable JSON response structure."
            />

            <CodeBlock
              title="Successful Response"
              value={`{
  "success": true,
  "message": "Transaction submitted successfully",
  "data": {
    "reference": "AYAX-2026-0001",
    "status": "PROCESSING",
    "service": "DATA",
    "amount": 500
  }
}`}
              copiedValue={copiedValue}
              copyLabel="standard-success-response"
              onCopy={copyText}
            />

            <CodeBlock
              title="Failed Response"
              value={`{
  "success": false,
  "message": "Insufficient wallet balance",
  "error": {
    "code": "INSUFFICIENT_BALANCE"
  }
}`}
              copiedValue={copiedValue}
              copyLabel="standard-failed-response"
              onCopy={copyText}
            />
          </DocSection>

          <DocSection id="errors">
            <SectionHeading
              icon={<AlertCircle />}
              eyebrow="Errors"
              title="HTTP Status Codes"
              description="Use both the HTTP status and response error code when handling failures."
            />

            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-800">
              {errorCodes.map((item, index) => (
                <div
                  key={item.code}
                  className={`grid gap-3 bg-slate-950 p-5 md:grid-cols-[80px_190px_1fr] ${
                    index !== errorCodes.length - 1
                      ? "border-b border-slate-800"
                      : ""
                  }`}
                >
                  <span className="font-mono font-bold text-blue-400">
                    {item.code}
                  </span>

                  <span className="font-semibold">
                    {item.title}
                  </span>

                  <span className="text-sm leading-6 text-slate-400">
                    {item.description}
                  </span>
                </div>
              ))}
            </div>
          </DocSection>

          <section className="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-600/20 via-slate-900 to-slate-900 p-8 text-center sm:p-12">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600">
              <FileCode2 size={27} />
            </div>

            <h2 className="mt-6 text-3xl font-extrabold">
              Ready to start building?
            </h2>

            <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-400">
              Create your developer account, fund your
              wallet, generate a Sandbox key and begin
              testing Ayax APIs.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 font-semibold hover:bg-blue-700"
              >
                Create Developer Account
                <ArrowRight size={18} />
              </Link>

              <Link
                href="/login"
                className="rounded-2xl border border-slate-700 bg-slate-900 px-6 py-4 font-semibold hover:bg-slate-800"
              >
                Developer Login
              </Link>
            </div>
          </section>
        </div>
      </section>

      <footer className="border-t border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <p>
            © 2026 Ayax Digital Solutions. All rights
            reserved.
          </p>

          <div className="flex flex-wrap gap-5">
            <Link
              href="/privacy"
              className="hover:text-white"
            >
              Privacy Policy
            </Link>

            <Link
              href="/terms"
              className="hover:text-white"
            >
              Terms of Service
            </Link>

            <Link
              href="/contact"
              className="hover:text-white"
            >
              Support
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function DocSection({
  id,
  children,
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8"
    >
      {children}
    </section>
  );
}

function SectionHeading({
  icon,
  eyebrow,
  title,
  description,
}) {
  return (
    <div>
      <div className="flex items-center gap-3 text-blue-400">
        {icon}

        <span className="text-sm font-semibold uppercase tracking-wide">
          {eyebrow}
        </span>
      </div>

      <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">
        {title}
      </h2>

      <p className="mt-4 max-w-3xl leading-7 text-slate-400">
        {description}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-extrabold">
        {value}
      </p>
    </div>
  );
}

function EnvironmentCard({
  title,
  badge,
  description,
  baseUrl,
  keyPrefix,
  production = false,
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-bold">
          {title}
        </h3>

        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            production
              ? "border-green-500/20 bg-green-500/10 text-green-300"
              : "border-violet-500/20 bg-violet-500/10 text-violet-300"
          }`}
        >
          {badge}
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-400">
        {description}
      </p>

      <div className="mt-5 space-y-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Base URL
          </p>

          <p className="mt-2 break-all font-mono text-sm text-blue-300">
            {baseUrl}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Key Prefix
          </p>

          <p className="mt-2 font-mono text-sm text-slate-300">
            {keyPrefix}...
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  text,
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
        {icon}
      </div>

      <h3 className="mt-4 font-bold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-400">
        {text}
      </p>
    </div>
  );
}

function CodeTab({
  label,
  active,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-blue-600 text-white"
          : "border border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function EndpointCodePanel({
  endpoint,
  selectedTab,
  copiedValue,
  onCopy,
}) {
  let title = "Request Body";
  let value = endpoint.request;

  if (selectedTab === "response") {
    title = "Example Response";
    value = endpoint.response;
  }

  if (selectedTab === "curl") {
    title = "cURL Example";
    value = getCurlExample(endpoint);
  }

  if (selectedTab === "node") {
    title = "Node.js Example";
    value = getNodeExample(endpoint);
  }

  const copyLabel = `${endpoint.id}-${selectedTab}`;

  return (
    <CodeBlock
      title={title}
      value={value}
      copiedValue={copiedValue}
      copyLabel={copyLabel}
      onCopy={onCopy}
    />
  );
}

function CodeBlock({
  title,
  value,
  copiedValue,
  copyLabel,
  onCopy,
}) {
  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-300">
          {title}
        </p>

        <button
          type="button"
          onClick={() =>
            onCopy(value, copyLabel)
          }
          className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white"
        >
          {copiedValue === copyLabel ? (
            <>
              <CheckCircle2
                size={15}
                className="text-green-400"
              />
              Copied
            </>
          ) : (
            <>
              <Copy size={15} />
              Copy
            </>
          )}
        </button>
      </div>

      <pre className="overflow-x-auto rounded-2xl border border-slate-800 bg-black/40 p-5 text-sm leading-7 text-slate-300">
        <code>{value}</code>
      </pre>
    </div>
  );
}

function MobileNavLink({
  href,
  label,
  onClick,
  primary = false,
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`block rounded-xl px-4 py-3 font-semibold ${
        primary
          ? "bg-blue-600 text-center text-white"
          : "bg-slate-900 text-slate-300"
      }`}
    >
      {label}
    </Link>
  );
}