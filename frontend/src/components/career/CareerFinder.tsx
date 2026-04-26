"use client";

import React, { useState } from 'react';
import { Briefcase, Code, Database, Palette, Shield, Cloud, Brain, Send, ArrowRight, CheckCircle } from 'lucide-react';

// Types for the career finder
interface FormData {
  fullName: string;
  email: string;
  studyLevel: string;
  interests: string[];
  programmingLevel: string;
  problemSolving: string;
  mathLogicSkills: string;
  workStyle: string;
  tools: string[];
  careerGoal: string;
}

interface CareerMatch {
  title: string;
  icon: React.ReactNode;
  description: string;
  skills: string[];
  matchScore: number;
  reasons: string[];
}

const CareerFinder: React.FC = () => {
  const [currentSection, setCurrentSection] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    studyLevel: '',
    interests: [],
    programmingLevel: '',
    problemSolving: '',
    mathLogicSkills: '',
    workStyle: '',
    tools: [],
    careerGoal: ''
  });
  const [showResults, setShowResults] = useState(false);
  const [careerMatches, setCareerMatches] = useState<CareerMatch[]>([]);

  // Career options with their matching logic
  const careerOptions = [
    {
      title: 'Software Developer',
      icon: <Code className="w-6 h-6" />,
      description: 'Build applications, websites, and software solutions',
      skills: ['Programming', 'Problem Solving', 'Web Technologies'],
      checkMatch: (data: FormData) => {
        let score = 0;
        const reasons = [];
        
        if (data.interests.includes('Web Development') || data.interests.includes('Mobile App Development')) {
          score += 40;
          reasons.push('Strong interest in web/mobile development');
        }
        
        if (data.programmingLevel === 'Intermediate' || data.programmingLevel === 'Advanced') {
          score += 30;
          reasons.push('Good programming foundation');
        }
        
        if (data.workStyle === 'Build applications (coding)') {
          score += 20;
          reasons.push('Prefers building and coding');
        }
        
        if (data.tools.includes('JavaScript') || data.tools.includes('React') || data.tools.includes('Node.js')) {
          score += 10;
          reasons.push('Relevant technical skills');
        }
        
        return { score, reasons };
      }
    },
    {
      title: 'Data Analyst / AI Engineer',
      icon: <Database className="w-6 h-6" />,
      description: 'Analyze data, build ML models, and derive insights',
      skills: ['Data Analysis', 'Statistics', 'Machine Learning'],
      checkMatch: (data: FormData) => {
        let score = 0;
        const reasons = [];
        
        if (data.interests.includes('Data Science / AI')) {
          score += 40;
          reasons.push('Strong interest in data science/AI');
        }
        
        if (data.mathLogicSkills === 'Medium' || data.mathLogicSkills === 'High') {
          score += 30;
          reasons.push('Strong math/logic skills');
        }
        
        if (data.workStyle === 'Analyze data') {
          score += 20;
          reasons.push('Enjoys data analysis');
        }
        
        if (data.tools.includes('Python')) {
          score += 10;
          reasons.push('Python knowledge is valuable');
        }
        
        return { score, reasons };
      }
    },
    {
      title: 'UI/UX Designer',
      icon: <Palette className="w-6 h-6" />,
      description: 'Design user interfaces and improve user experience',
      skills: ['Design Principles', 'User Research', 'Prototyping'],
      checkMatch: (data: FormData) => {
        let score = 0;
        const reasons = [];
        
        if (data.interests.includes('UI/UX Design')) {
          score += 40;
          reasons.push('Strong interest in UI/UX design');
        }
        
        if (data.workStyle === 'Design interfaces') {
          score += 30;
          reasons.push('Prefers design work');
        }
        
        if (data.careerGoal === 'Creativity') {
          score += 20;
          reasons.push('Values creativity in work');
        }
        
        if (data.tools.includes('Figma')) {
          score += 10;
          reasons.push('Design tool experience');
        }
        
        return { score, reasons };
      }
    },
    {
      title: 'Cybersecurity Analyst',
      icon: <Shield className="w-6 h-6" />,
      description: 'Protect systems and networks from security threats',
      skills: ['Security Principles', 'Network Security', 'Risk Assessment'],
      checkMatch: (data: FormData) => {
        let score = 0;
        const reasons = [];
        
        if (data.interests.includes('Cybersecurity')) {
          score += 40;
          reasons.push('Strong interest in cybersecurity');
        }
        
        if (data.workStyle === 'Secure systems') {
          score += 30;
          reasons.push('Interested in system security');
        }
        
        if (data.problemSolving === 'High') {
          score += 20;
          reasons.push('Strong problem-solving skills');
        }
        
        return { score, reasons };
      }
    },
    {
      title: 'DevOps Engineer',
      icon: <Cloud className="w-6 h-6" />,
      description: 'Manage deployment, infrastructure, and system operations',
      skills: ['Cloud Computing', 'Containerization', 'Automation'],
      checkMatch: (data: FormData) => {
        let score = 0;
        const reasons = [];
        
        if (data.interests.includes('Networking / Cloud')) {
          score += 40;
          reasons.push('Interest in cloud/networking');
        }
        
        if (data.workStyle === 'Manage systems/cloud') {
          score += 30;
          reasons.push('Prefers system management');
        }
        
        if (data.tools.includes('Docker') || data.tools.includes('AWS')) {
          score += 30;
          reasons.push('Relevant DevOps tools experience');
        }
        
        return { score, reasons };
      }
    },
    {
      title: 'AI/ML Engineer',
      icon: <Brain className="w-6 h-6" />,
      description: 'Build artificial intelligence and machine learning systems',
      skills: ['Machine Learning', 'Deep Learning', 'Python'],
      checkMatch: (data: FormData) => {
        let score = 0;
        const reasons = [];
        
        if (data.interests.includes('Data Science / AI')) {
          score += 40;
          reasons.push('Strong interest in AI/ML');
        }
        
        if (data.mathLogicSkills === 'High') {
          score += 30;
          reasons.push('Excellent math/logic foundation');
        }
        
        if (data.programmingLevel === 'Advanced') {
          score += 20;
          reasons.push('Advanced programming skills');
        }
        
        if (data.careerGoal === 'Research/innovation') {
          score += 10;
          reasons.push('Interested in research and innovation');
        }
        
        return { score, reasons };
      }
    }
  ];

  const handleInputChange = (field: keyof FormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleToolToggle = (tool: string) => {
    setFormData(prev => ({
      ...prev,
      tools: prev.tools.includes(tool)
        ? prev.tools.filter(t => t !== tool)
        : [...prev.tools, tool]
    }));
  };

  const calculateCareerMatches = () => {
    const matches = careerOptions.map(career => {
      const { score, reasons } = career.checkMatch(formData);
      return {
        title: career.title,
        icon: career.icon,
        description: career.description,
        skills: career.skills,
        matchScore: score,
        reasons
      };
    });

    // Sort by score and take top 2
    const topMatches = matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, 2);
    setCareerMatches(topMatches);
    setShowResults(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    calculateCareerMatches();
  };

  const nextSection = () => {
    if (currentSection < 7) {
      setCurrentSection(currentSection + 1);
    }
  };

  const prevSection = () => {
    if (currentSection > 1) {
      setCurrentSection(currentSection - 1);
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      studyLevel: '',
      interests: [],
      programmingLevel: '',
      problemSolving: '',
      mathLogicSkills: '',
      workStyle: '',
      tools: [],
      careerGoal: ''
    });
    setCurrentSection(1);
    setShowResults(false);
    setCareerMatches([]);
  };

  if (showResults) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Your Career Matches</h2>
            <p className="text-gray-600">Based on your responses, here are your top 2 career recommendations:</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {careerMatches.map((career, index) => (
              <div key={career.title} className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
                <div className="flex items-center mb-4">
                  <div className="text-blue-600 mr-3">{career.icon}</div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{career.title}</h3>
                    <div className="flex items-center mt-1">
                      <div className="text-sm text-gray-600">Match Score:</div>
                      <div className="ml-2 bg-blue-600 text-white px-2 py-1 rounded text-sm font-semibold">
                        {career.matchScore}%
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-4">{career.description}</p>
                
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Key Skills:</h4>
                  <div className="flex flex-wrap gap-2">
                    {career.skills.map(skill => (
                      <span key={skill} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Why this matches you:</h4>
                  <ul className="space-y-1">
                    {career.reasons.map((reason, idx) => (
                      <li key={idx} className="flex items-start text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={resetForm}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Take Assessment Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Briefcase className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Career Finder</h1>
          <p className="text-gray-600">Discover your ideal IT career path based on your interests and skills</p>
          
          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Section {currentSection} of 7</span>
              <span>{Math.round((currentSection / 7) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentSection / 7) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Section 1: Basic Information */}
          {currentSection === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">🟢 Basic Information</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Study Level</label>
                <select
                  value={formData.studyLevel}
                  onChange={(e) => handleInputChange('studyLevel', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select your level</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="Final Year">Final Year</option>
                  <option value="Graduate">Graduate</option>
                </select>
              </div>
            </div>
          )}

          {/* Section 2: Interests */}
          {currentSection === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">🟢 Interests</h2>
              <p className="text-gray-600 mb-4">What are you most interested in? (Select all that apply)</p>
              
              <div className="space-y-3">
                {[
                  'Web Development',
                  'Mobile App Development',
                  'Data Science / AI',
                  'Cybersecurity',
                  'UI/UX Design',
                  'Networking / Cloud',
                  'Game Development'
                ].map(interest => (
                  <label key={interest} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.interests.includes(interest)}
                      onChange={() => handleInterestToggle(interest)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700">{interest}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Skills Level */}
          {currentSection === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">🟢 Skills Level</h2>
              <p className="text-gray-600 mb-4">Rate your current skills</p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Programming Level</label>
                <select
                  value={formData.programmingLevel}
                  onChange={(e) => handleInputChange('programmingLevel', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select level</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Problem Solving</label>
                <select
                  value={formData.problemSolving}
                  onChange={(e) => handleInputChange('problemSolving', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select level</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Math/Logic Skills</label>
                <select
                  value={formData.mathLogicSkills}
                  onChange={(e) => handleInputChange('mathLogicSkills', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select level</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
          )}

          {/* Section 4: Preferred Work Style */}
          {currentSection === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">🟢 Preferred Work Style</h2>
              <p className="text-gray-600 mb-4">How do you like to work?</p>
              
              <div className="space-y-3">
                {[
                  'Build applications (coding)',
                  'Analyze data',
                  'Design interfaces',
                  'Secure systems',
                  'Manage systems/cloud'
                ].map(style => (
                  <label key={style} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="workStyle"
                      value={style}
                      checked={formData.workStyle === style}
                      onChange={(e) => handleInputChange('workStyle', e.target.value)}
                      className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                      required
                    />
                    <span className="text-gray-700">{style}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Section 5: Tools You Know */}
          {currentSection === 5 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">🟢 Tools You Know</h2>
              <p className="text-gray-600 mb-4">Which tools/technologies do you know? (Select all that apply)</p>
              
              <div className="grid grid-cols-2 gap-3">
                {[
                  'JavaScript',
                  'Java',
                  'Python',
                  'React',
                  'Node.js',
                  'MongoDB',
                  'Figma',
                  'Docker',
                  'AWS'
                ].map(tool => (
                  <label key={tool} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.tools.includes(tool)}
                      onChange={() => handleToolToggle(tool)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700">{tool}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Section 6: Career Goal */}
          {currentSection === 6 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">🟢 Career Goal</h2>
              <p className="text-gray-600 mb-4">What is your main goal?</p>
              
              <div className="space-y-3">
                {[
                  'High salary',
                  'Creativity',
                  'Job stability',
                  'Remote work',
                  'Research/innovation'
                ].map(goal => (
                  <label key={goal} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="careerGoal"
                      value={goal}
                      checked={formData.careerGoal === goal}
                      onChange={(e) => handleInputChange('careerGoal', e.target.value)}
                      className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                      required
                    />
                    <span className="text-gray-700">{goal}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Section 7: Submit */}
          {currentSection === 7 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">🟢 Ready to Find Your Career?</h2>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-2">Review Your Responses:</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Name:</strong> {formData.fullName}</p>
                  <p><strong>Email:</strong> {formData.email}</p>
                  <p><strong>Study Level:</strong> {formData.studyLevel}</p>
                  <p><strong>Interests:</strong> {formData.interests.join(', ') || 'None selected'}</p>
                  <p><strong>Programming Level:</strong> {formData.programmingLevel}</p>
                  <p><strong>Work Style:</strong> {formData.workStyle}</p>
                  <p><strong>Tools:</strong> {formData.tools.join(', ') || 'None selected'}</p>
                  <p><strong>Career Goal:</strong> {formData.careerGoal}</p>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-gray-600 mb-4">Click below to discover your ideal IT career path!</p>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
                >
                  <Send className="w-5 h-5" />
                  <span>Find My Career Path</span>
                </button>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          {currentSection < 7 && (
            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={prevSection}
                disabled={currentSection === 1}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={nextSection}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default CareerFinder;
