import Image from "next/image";
import Link from "next/link";

import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CheckCircle2,
  Code2,
  Database,
  FileCode2,
  Globe2,
  Headphones,
  KeyRound,
  Layers3,
  LockKeyhole,
  Network,
  Rocket,
  Server,
  ShieldCheck,
  Smartphone,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

const platformFeatures = [
  {
    icon: Code2,
    title: "Developer-First Platform",
    description:
      "Clean REST API endpoints, predictable JSON responses and practical documentation designed to make integration easier.",
  },
  {
    icon: Wallet,
    title: "Integrated Wallet System",
    description:
      "Developers can fund their wallets, monitor balances and pay for successful API transactions from one account.",
  },
  {
    icon: ShieldCheck,
    title: "Secure API Access",
    description:
      "Protected authentication, API key permissions, request validation, rate limits and transaction monitoring.",
  },
  {
    icon: Activity,
    title: "Transaction Monitoring",
    description:
      "Track API requests, service transactions, processing states and completed operations from the developer dashboard.",
  },
  {
    icon: Layers3,
    title: "Multiple Digital Services",
    description:
      "Access supported telecom, utility, identity-verification and digital service APIs through one platform.",
  },
  {
    icon: BarChart3,
    title: "Usage Analytics",
    description:
      "Review API activity, successful requests, failed requests, service usage and operational performance.",
  },
];

const supportedServices = [
  {
    icon: Network,
    title: "Data API",
    description:
      "Retrieve available data plans and purchase internet bundles for supported mobile networks.",
  },
  {
    icon: Smartphone,
    title: "Airtime API",
    description:
      "Send airtime top-ups to supported Nigerian mobile phone numbers.",
  },
  {
    icon: Zap,
    title: "Electricity API",
    description:
      "Validate meter information and process supported electricity payments.",
  },
  {
    icon: Server,
    title: "Cable Subscription API",
    description:
      "Validate customer smartcards and process supported television subscriptions.",
  },
  {
    icon: BadgeCheck,
    title: "Identity Services",
    description:
      "Connect to available BVN, NIN and approved identity-verification services.",
  },
  {
    icon: Database,
    title: "Transaction API",
    description:
      "Retrieve transaction details and check processing status using a unique reference.",
  },
];

const audiences = [
  {
    icon: Code2,
    title: "Software Developers",
    description:
      "Developers building websites, mobile applications, dashboards and backend systems.",
  },
  {
    icon: Rocket,
    title: "Technology Startups",
    description:
      "Startups that need digital service infrastructure without building every integration from the beginning.",
  },
  {
    icon: Building2,
    title: "Businesses",
    description:
      "Organizations seeking to automate customer transactions and digital service delivery.",
  },
  {
    icon: Users,
    title: "VTU and API Resellers",
    description:
      "Resellers creating data, airtime, utility payment and digital service platforms.",
  },
];

const operationSteps = [
  {
    number: "01",
    title: "Create a Developer Account",
    description:
      "Register an account and complete the required developer profile information.",
  },
  {
    number: "02",
    title: "Fund Your Wallet",
    description:
      "Add money to your developer wallet before processing paid live service requests.",
  },
  {
    number: "03",
    title: "Generate an API Key",
    description:
      "Create a Sandbox or Production key with the permissions required by your application.",
  },
  {
    number: "04",
    title: "Integrate the API",
    description:
      "Use the documentation, endpoint examples and response formats to connect your backend system.",
  },
  {
    number: "05",
    title: "Monitor Transactions",
    description:
      "Track API usage, wallet deductions, transactions and application activity from your dashboard.",
  },
];

const securityFeatures = [
  "Secure developer authentication",
  "Production and Sandbox API environments",
  "API key permissions and service scopes",
  "Request validation and error handling",
  "Configurable request rate limits",
  "Wallet and transaction audit records",
  "API activity and usage monitoring",
  "Backend-based secret key protection",
];

const coreValues = [
  {
    icon: ShieldCheck,
    title: "Security",
    description:
      "We design our platform around secure access, protected credentials and responsible handling of developer activity.",
  },
  {
    icon: FileCode2,
    title: "Simplicity",
    description:
      "We aim to make documentation, endpoints and integration processes understandable and practical.",
  },
  {
    icon: Activity,
    title: "Reliability",
    description:
      "We build systems that help developers monitor requests, identify failures and manage operations clearly.",
  },
  {
    icon: Users,
    title: "Partnership",
    description:
      "We see developers and businesses as partners building products on top of our infrastructure.",
  },
];

const reasons = [
  "One account for multiple supported digital service APIs",
  "Production and Sandbox environments",
  "Secure API key management",
  "Developer wallet and transaction records",
  "API plans and service-based pricing",
  "Request monitoring and usage analytics",
  "Developer-friendly API documentation",
  "Consistent JSON response structure",
  "Unique transaction reference tracking",
  "Built for websites, mobile apps, POS systems and reseller platforms",
  "Administrative monitoring and audit capabilities",
  "Support for growing developer businesses",
];

export default function AboutPage() {
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
                Developer Marketplace
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            <Link
              href="/marketplace"
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              Marketplace
            </Link>

            <Link
              href="/docs"
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              Documentation
            </Link>

            <Link
              href="/pricing"
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              Pricing
            </Link>

            <Link
              href="/login"
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              Login
            </Link>

            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-700"
            >
              Get Started
              <ArrowRight size={17} />
            </Link>
          </div>

          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold md:hidden"
          >
            Get Started
          </Link>
        </nav>
      </header>

      <section className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-slate-950 to-slate-950" />

        <div className="absolute -right-40 top-10 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:px-6 lg:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-300">
              <Globe2 size={16} />
              About Ayax APIs
            </div>

            <h1 className="mt-6 max-w-5xl text-4xl font-black leading-tight sm:text-5xl lg:text-7xl">
              Building infrastructure for{" "}
              <span className="text-blue-500">
                developer-powered
              </span>{" "}
              digital services.
            </h1>

            <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-300">
              Ayax API Marketplace is a developer platform
              created by Ayax Digital Solutions to help
              developers, startups, resellers and businesses
              access supported digital service APIs through
              one secure and organized system.
            </p>

            <p className="mt-4 max-w-3xl leading-8 text-slate-400">
              Instead of connecting separately to multiple
              providers, developers can use Ayax APIs to manage
              credentials, wallet funding, service requests,
              transactions, documentation and analytics from a
              unified developer account.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-7 py-4 font-semibold transition hover:bg-blue-700"
              >
                Start Building
                <ArrowRight size={18} />
              </Link>

              <Link
                href="/docs"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-7 py-4 font-semibold transition hover:bg-slate-800"
              >
                Read Documentation
                <FileCode2 size={18} />
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
              <div className="flex items-center justify-between border-b border-slate-800 pb-5">
                <div>
                  <p className="text-sm text-slate-500">
                    Ayax Developer Platform
                  </p>

                  <h2 className="mt-1 text-xl font-bold">
                    One Integration Layer
                  </h2>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600">
                  <Code2 size={23} />
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <ArchitectureItem
                  icon={<Users size={19} />}
                  title="Developer Application"
                  description="Website, mobile app, POS or reseller platform"
                />

                <div className="flex justify-center">
                  <ArrowDown />
                </div>

                <ArchitectureItem
                  icon={<ShieldCheck size={19} />}
                  title="Ayax API Infrastructure"
                  description="Authentication, wallet, plans, monitoring and routing"
                  active
                />

                <div className="flex justify-center">
                  <ArrowDown />
                </div>

                <ArchitectureItem
                  icon={<Server size={19} />}
                  title="Supported Service Providers"
                  description="Telecom, utility, identity and digital service systems"
                />
              </div>

              <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                <p className="text-sm leading-6 text-blue-200">
                  Developers interact with the Ayax API layer.
                  Upstream provider communication is managed by
                  the Ayax backend infrastructure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-6">
        <SectionHeader
          eyebrow="What We Provide"
          title="A complete developer API platform"
          description="Ayax APIs combines the infrastructure developers need to integrate, operate and monitor digital services."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {platformFeatures.map((feature) => {
            const Icon = feature.icon;

            return (
              <FeatureCard
                key={feature.title}
                icon={<Icon size={23} />}
                title={feature.title}
                description={feature.description}
              />
            );
          })}
        </div>
      </section>

      <section className="border-y border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-6">
          <SectionHeader
            eyebrow="API Marketplace"
            title="Digital services available from one platform"
            description="Developers can select and integrate supported APIs according to their application requirements and assigned plan."
          />

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {supportedServices.map((service) => {
              const Icon = service.icon;

              return (
                <ServiceCard
                  key={service.title}
                  icon={<Icon size={22} />}
                  title={service.title}
                  description={service.description}
                />
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-6 py-4 font-semibold transition hover:border-blue-500 hover:text-blue-300"
            >
              Explore API Marketplace
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-6">
        <SectionHeader
          eyebrow="Built For Growth"
          title="Who can use Ayax APIs?"
          description="The platform is designed for developers and organizations building technology-enabled products and services."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {audiences.map((audience) => {
            const Icon = audience.icon;

            return (
              <AudienceCard
                key={audience.title}
                icon={<Icon size={24} />}
                title={audience.title}
                description={audience.description}
              />
            );
          })}
        </div>
      </section>

      <section className="border-y border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-6">
          <SectionHeader
            eyebrow="Our Direction"
            title="Mission and vision"
            description="Our work is focused on making digital service infrastructure more accessible, organized and secure."
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7 sm:p-9">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600">
                <Rocket size={26} />
              </div>

              <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-blue-400">
                Our Mission
              </p>

              <h3 className="mt-3 text-3xl font-bold">
                Make digital APIs easier to access and use.
              </h3>

              <p className="mt-5 leading-8 text-slate-400">
                Our mission is to help African developers and
                businesses launch digital products faster by
                providing structured APIs, secure authentication,
                wallet infrastructure, documentation and
                transaction management through one platform.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7 sm:p-9">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600">
                <Globe2 size={26} />
              </div>

              <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-blue-400">
                Our Vision
              </p>

              <h3 className="mt-3 text-3xl font-bold">
                Become trusted digital infrastructure for builders.
              </h3>

              <p className="mt-5 leading-8 text-slate-400">
                Our vision is to build a dependable API
                infrastructure company connecting developers,
                businesses and service providers through a
                professional marketplace designed for innovation,
                automation and scalable digital operations.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-6">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <SectionHeader
              eyebrow="How It Works"
              title="From registration to live integration"
              description="A clear process helps developers move from account creation to production API usage."
              align="left"
            />

            <Link
              href="/docs"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300"
            >
              View integration documentation
              <ArrowRight size={17} />
            </Link>
          </div>

          <div className="space-y-4">
            {operationSteps.map((step) => (
              <ProcessStep
                key={step.number}
                number={step.number}
                title={step.title}
                description={step.description}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-800 bg-slate-900/40">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-2 lg:items-center lg:px-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-300">
              <LockKeyhole size={16} />
              Security and Infrastructure
            </div>

            <h2 className="mt-6 text-4xl font-extrabold leading-tight sm:text-5xl">
              Designed to protect developer credentials and transactions.
            </h2>

            <p className="mt-6 leading-8 text-slate-400">
              Ayax APIs uses authentication, API key controls,
              permissions, request validation and transaction
              records to help protect developer accounts and
              digital service operations.
            </p>

            <div className="mt-8 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  size={22}
                  className="mt-0.5 shrink-0 text-yellow-300"
                />

                <p className="text-sm leading-6 text-yellow-100/80">
                  Secret Production API keys must only be used
                  from a protected backend server. They should
                  never be exposed in frontend code, public
                  applications or source-code repositories.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {securityFeatures.map((feature) => (
              <div
                key={feature}
                className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5"
              >
                <CheckCircle2
                  size={20}
                  className="mt-0.5 shrink-0 text-blue-400"
                />

                <span className="text-sm leading-6 text-slate-300">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-6">
        <SectionHeader
          eyebrow="Our Values"
          title="Principles guiding the platform"
          description="We are building Ayax APIs around security, simplicity, reliability and collaboration."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {coreValues.map((value) => {
            const Icon = value.icon;

            return (
              <ValueCard
                key={value.title}
                icon={<Icon size={22} />}
                title={value.title}
                description={value.description}
              />
            );
          })}
        </div>
      </section>

      <section className="border-y border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-6">
          <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <SectionHeader
                eyebrow="Why Ayax APIs?"
                title="Infrastructure for modern digital businesses"
                description="We combine developer tools, service access and operational controls inside one marketplace."
                align="left"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {reasons.map((reason) => (
                <div
                  key={reason}
                  className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5"
                >
                  <CheckCircle2
                    size={20}
                    className="mt-0.5 shrink-0 text-blue-400"
                  />

                  <span className="text-sm leading-6 text-slate-300">
                    {reason}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-6">
        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
          <div className="grid lg:grid-cols-2">
            <div className="p-7 sm:p-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600">
                <Building2 size={26} />
              </div>

              <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-blue-400">
                The Company
              </p>

              <h2 className="mt-3 text-3xl font-extrabold">
                Powered by Ayax Digital Solutions
              </h2>

              <p className="mt-5 leading-8 text-slate-400">
                Ayax APIs is developed as part of Ayax
                Digital Solutions&apos; work in software
                development, digital platforms, business
                automation and technology infrastructure.
              </p>

              <p className="mt-4 leading-8 text-slate-400">
                The platform is being built to support
                developers and organizations that need
                structured access to digital services through
                modern applications.
              </p>
            </div>

            <div className="border-t border-slate-800 bg-slate-950/60 p-7 sm:p-10 lg:border-l lg:border-t-0">
              <h3 className="text-xl font-bold">
                Platform Support
              </h3>

              <div className="mt-6 space-y-4">
                <ContactItem
                  icon={<FileCode2 size={20} />}
                  title="Developer Documentation"
                  description="Review authentication, endpoints, examples and response formats."
                  href="/docs"
                  linkLabel="Open documentation"
                />

                <ContactItem
                  icon={<Headphones size={20} />}
                  title="Developer Support"
                  description="Get assistance with accounts, API keys and integration issues."
                  href="/contact"
                  linkLabel="Contact support"
                />

                <ContactItem
                  icon={<KeyRound size={20} />}
                  title="Developer Account"
                  description="Create an account, fund your wallet and generate API credentials."
                  href="/register"
                  linkLabel="Create account"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-blue-600 px-6 py-14 text-center sm:px-10 sm:py-16">
          <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

          <div className="absolute -bottom-32 -right-20 h-72 w-72 rounded-full bg-slate-950/20 blur-3xl" />

          <div className="relative">
            <Activity
              className="mx-auto"
              size={44}
            />

            <h2 className="mx-auto mt-6 max-w-3xl text-3xl font-extrabold sm:text-4xl">
              Ready to build with Ayax APIs?
            </h2>

            <p className="mx-auto mt-5 max-w-2xl leading-7 text-blue-100">
              Create a developer account, explore available
              services, generate your API key and begin
              integrating digital services into your
              application.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 font-bold text-blue-700 transition hover:bg-blue-50"
              >
                Create Developer Account
                <ArrowRight size={18} />
              </Link>

              <Link
                href="/docs"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-7 py-4 font-semibold text-white transition hover:bg-white/20"
              >
                View API Documentation
                <Code2 size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-7xl px-5 py-12 lg:px-6">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link
                href="/"
                className="flex items-center gap-3"
              >
                <Image
                  src="/assets/logo.png"
                  alt="Ayax APIs Logo"
                  width={44}
                  height={44}
                  className="rounded-xl object-contain"
                />

                <div>
                  <p className="text-lg font-extrabold">
                    Ayax{" "}
                    <span className="text-blue-500">
                      APIs
                    </span>
                  </p>

                  <p className="text-xs text-slate-500">
                    Developer Marketplace
                  </p>
                </div>
              </Link>

              <p className="mt-5 text-sm leading-7 text-slate-500">
                Developer infrastructure for integrating
                supported telecom, utility, identity and
                digital service APIs.
              </p>
            </div>

            <FooterGroup
              title="Platform"
              links={[
                {
                  label: "API Marketplace",
                  href: "/marketplace",
                },
                {
                  label: "Pricing",
                  href: "/pricing",
                },
                {
                  label: "Documentation",
                  href: "/docs",
                },
                {
                  label: "Developer Login",
                  href: "/login",
                },
              ]}
            />

            <FooterGroup
              title="Company"
              links={[
                {
                  label: "About Us",
                  href: "/about",
                },
                {
                  label: "Contact",
                  href: "/contact",
                },
                {
                  label: "Privacy Policy",
                  href: "/privacy",
                },
                {
                  label: "Terms of Service",
                  href: "/terms",
                },
              ]}
            />

            <div>
              <h3 className="font-bold">
                Start Building
              </h3>

              <p className="mt-4 text-sm leading-6 text-slate-500">
                Create your developer account and access
                supported APIs from one platform.
              </p>

              <Link
                href="/register"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-700"
              >
                Create Account
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-slate-800 pt-7 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © 2026 Ayax Digital Solutions. All rights
              reserved.
            </p>

            <p>
              Ayax APIs Developer Marketplace
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
}) {
  const alignment =
    align === "left"
      ? "text-left"
      : "mx-auto text-center";

  return (
    <div
      className={`max-w-3xl ${alignment}`}
    >
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-400">
        {eyebrow}
      </p>

      <h2 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
        {title}
      </h2>

      <p className="mt-5 leading-8 text-slate-400">
        {description}
      </p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}) {
  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-900 p-6 transition hover:-translate-y-1 hover:border-blue-500/40">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
        {icon}
      </div>

      <h3 className="mt-6 text-xl font-bold">
        {title}
      </h3>

      <p className="mt-3 leading-7 text-slate-400">
        {description}
      </p>
    </article>
  );
}

function ServiceCard({
  icon,
  title,
  description,
}) {
  return (
    <article className="group rounded-3xl border border-slate-800 bg-slate-900 p-6 transition hover:border-blue-500/40">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 transition group-hover:bg-blue-600 group-hover:text-white">
        {icon}
      </div>

      <h3 className="mt-5 text-xl font-bold">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-7 text-slate-400">
        {description}
      </p>
    </article>
  );
}

function AudienceCard({
  icon,
  title,
  description,
}) {
  return (
    <article className="flex gap-5 rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600">
        {icon}
      </div>

      <div>
        <h3 className="text-xl font-bold">
          {title}
        </h3>

        <p className="mt-3 leading-7 text-slate-400">
          {description}
        </p>
      </div>
    </article>
  );
}

function ProcessStep({
  number,
  title,
  description,
}) {
  return (
    <article className="flex gap-5 rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 font-bold text-blue-400">
        {number}
      </div>

      <div>
        <h3 className="text-lg font-bold">
          {title}
        </h3>

        <p className="mt-2 text-sm leading-7 text-slate-400">
          {description}
        </p>
      </div>
    </article>
  );
}

function ValueCard({
  icon,
  title,
  description,
}) {
  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
        {icon}
      </div>

      <h3 className="mt-5 text-xl font-bold">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-7 text-slate-400">
        {description}
      </p>
    </article>
  );
}

function ArchitectureItem({
  icon,
  title,
  description,
  active = false,
}) {
  return (
    <div
      className={`flex items-start gap-4 rounded-2xl border p-4 ${
        active
          ? "border-blue-500/30 bg-blue-500/10"
          : "border-slate-800 bg-slate-950"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          active
            ? "bg-blue-600 text-white"
            : "bg-slate-800 text-slate-300"
        }`}
      >
        {icon}
      </div>

      <div>
        <h3 className="font-semibold">
          {title}
        </h3>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function ArrowDown() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-800 bg-slate-950 text-slate-500">
      ↓
    </div>
  );
}

function ContactItem({
  icon,
  title,
  description,
  href,
  linkLabel,
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
          {icon}
        </div>

        <div>
          <h4 className="font-bold">
            {title}
          </h4>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            {description}
          </p>

          <Link
            href={href}
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300"
          >
            {linkLabel}
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function FooterGroup({
  title,
  links,
}) {
  return (
    <div>
      <h3 className="font-bold">
        {title}
      </h3>

      <div className="mt-5 space-y-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block text-sm text-slate-500 transition hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}