import { Shield, Zap, Brain, CheckCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router";

export function IntroPage() {
  return (
    <div className="h-full overflow-auto bg-[#0d0d0d]">
      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <Shield className="w-14 h-14 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-400 rounded-full animate-pulse" />
            </div>
          </div>

          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
            Super SAST
          </h1>

          <p className="text-xl text-gray-400 mb-2">
            Advanced Security Analysis System & Testing
          </p>

          <p className="text-sm text-gray-500 max-w-3xl mx-auto">
            An automated security testing by integration SAST and LLM to produce
            false positive and verify PoC
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6 hover:border-blue-500/50 transition-all">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Automated Scanning
            </h3>
            <p className="text-sm text-gray-400">
              Comprehensive vulnerability detection using multiple SAST tools
              including Snyk, Semgrep, and CodeQL
            </p>
          </div>

          <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6 hover:border-purple-500/50 transition-all">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              LLM Analysis
            </h3>
            <p className="text-sm text-gray-400">
              AI-powered analysis using Gemini or Fine-tuned models to classify
              findings and reduce false positives
            </p>
          </div>

          <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6 hover:border-green-500/50 transition-all">
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              PoC Verification
            </h3>
            <p className="text-sm text-gray-400">
              Automatic generation and verification of Proof of Concept to
              confirm true vulnerabilities
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            How It Works
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4 bg-[#1a1a1a] border border-[#333333] rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">
                  Upload Source Code
                </h4>
                <p className="text-sm text-gray-400">
                  Upload your project files or folder for comprehensive security
                  analysis
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-[#1a1a1a] border border-[#333333] rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">
                  Automated SAST Scan
                </h4>
                <p className="text-sm text-gray-400">
                  System detects SQL Injection, XSS, and Command Injection
                  vulnerabilities using combine traditional tools
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-[#1a1a1a] border border-[#333333] rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                3
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">
                  LLM Analysis & Classification
                </h4>
                <p className="text-sm text-gray-400">
                  AI analyzes each finding to determine false positives (FP) or
                  true positives (TP) then generate PoC for verification
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-[#1a1a1a] border border-[#333333] rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                4
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">
                  PoC Verification
                </h4>
                <p className="text-sm text-gray-400">
                  For each true positives, Generated PoC will be executed in
                  Sandbox Environment to verify that findings
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium text-lg"
          >
            Get Started
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-400 mb-2">3+</div>
            <div className="text-sm text-gray-500">Vulnerability Types</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-purple-400 mb-2">LLM</div>
            <div className="text-sm text-gray-500">Powered Analysis</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-400 mb-2">100%</div>
            <div className="text-sm text-gray-500">Automated Process</div>
          </div>
        </div>
      </div>
    </div>
  );
}
