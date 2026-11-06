import { Link } from 'react-router-dom';
import { Video, Bot, Clock, Cloud } from 'lucide-react';

export default function Landing() {
  const features = [
    { title: 'Smart Recording', icon: Video, description: 'Record your meetings with a single click' },
    { title: 'AI Summaries', icon: Bot, description: 'Get instant AI-powered meeting summaries' },
    { title: 'Time Stamps', icon: Clock, description: 'Navigate through key moments easily' },
    { title: 'Cloud Sync', icon: Cloud, description: 'Access your notes from anywhere' },
  ];

  const steps = [
    { number: '1', title: 'Install Extension', description: 'Add our Chrome extension to your browser' },
    { number: '2', title: 'Record Meeting', description: 'Click to start recording your online class' },
    { number: '3', title: 'Get Summary', description: 'Receive AI-generated notes and summaries' },
  ];

  return (
    <div className="min-h-screen bg-noise">
      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-16 md:py-24">
          <h1 className="font-heading font-extrabold text-4xl sm:text-5xl md:text-6xl text-text">
            Meetings, but make them
            <span className="block text-primary">scrapbooks.</span>
          </h1>
          <p className="mt-6 max-w-md mx-auto text-base sm:text-lg md:max-w-2xl text-text/70">
            Record your online classes and get AI-powered summaries in real-time.
            Never miss important details again.
          </p>
          <div className="mt-8 max-w-md mx-auto flex flex-col sm:flex-row sm:justify-center gap-4">
            <Link
              to="/signup"
              className="btn-brutal bg-primary text-text px-8 py-4 rounded-pill font-heading font-bold text-lg"
            >
              Get Started
            </Link>
            <a
              href="#features"
              className="btn-brutal bg-surface text-text px-8 py-4 rounded-pill font-heading font-bold text-lg"
            >
              Learn More
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Features */}
        <div id="features" className="py-16">
          <div className="text-center mb-12">
            <h2 className="font-heading font-extrabold text-3xl text-text">Powerful Features</h2>
            <p className="mt-4 text-text/60">Everything you need to enhance your learning experience</p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="card-brutal p-6 transform transition-transform duration-300 hover:rotate-0"
                style={{ transform: `rotate(${i % 2 === 0 ? -1 : 1}deg)` }}
              >
                <div className="w-12 h-12 rounded-chunky bg-accent border-2 border-text flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-surface" strokeWidth={2.5} />
                </div>
                <h3 className="font-heading font-bold text-lg text-text">{feature.title}</h3>
                <p className="mt-2 text-text/60">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="py-16 border-t-4 border-muted">
          <div className="text-center mb-12">
            <h2 className="font-heading font-extrabold text-3xl text-text">How It Works</h2>
            <p className="mt-4 text-text/60">Three simple steps to get started</p>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            {steps.map((step) => (
              <div key={step.number} className="flex-1 text-center p-6">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary border-4 border-text shadow-brutal flex items-center justify-center font-heading font-extrabold text-xl text-text">
                  {step.number}
                </div>
                <h3 className="font-heading font-bold text-lg text-text">{step.title}</h3>
                <p className="mt-2 text-text/60">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="py-16 border-t-4 border-muted">
          <div className="card-brutal bg-accent p-8 md:p-12 text-center">
            <h2 className="font-heading font-extrabold text-3xl text-text mb-4">Ready to Transform Your Learning?</h2>
            <p className="mb-8 text-text/70">Join thousands of students already using EchoNote</p>
            <Link
              to="/signup"
              className="btn-brutal inline-flex items-center justify-center bg-surface text-text px-8 py-4 rounded-pill font-heading font-bold text-lg"
            >
              Start For Free
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
