import React from 'react';
import { motion } from 'framer-motion';
import './Testimonials.css';

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'College Student',
    text: 'SafeHaven gives me peace of mind when I\'m walking home late at night. It\'s like having a guardian angel in my pocket.',
  },
  {
    name: 'Michael Chen',
    role: 'Business Traveler',
    text: 'As someone who travels frequently, SafeHaven has become an essential part of my safety toolkit. Highly recommended!',
  },
  {
    name: 'Emily Rodriguez',
    role: 'Parent',
    text: 'I feel so much better knowing my kids have SafeHaven on their phones. It\'s a must-have for every family.',
  },
];

const Testimonials = () => {
  return (
    <section className="testimonials">
      <h2>What Our Users Say</h2>
      <div className="testimonials-grid">
        {testimonials.map((testimonial, index) => (
          <motion.div
            key={index}
            className="testimonial-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <p>"{testimonial.text}"</p>
            <h4>{testimonial.name}</h4>
            <span>{testimonial.role}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default Testimonials;
