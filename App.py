from flask import Flask, request, jsonify, render_template
import joblib
import numpy as np
import os

app = Flask(__name__)

# Load the saved model and scaler
MODEL_PATH = 'model/crop_model.joblib'
SCALER_PATH = 'model/scaler.joblib'

if not os.path.exists(MODEL_PATH) or not os.path.exists(SCALER_PATH):
    print("ERROR: Model or Scaler not found! Please run train.py first.")
    exit(1)

model = joblib.load(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        
        # Build features list in the exact order the model expects:
        # N, P, K, temperature, humidity, ph, rainfall
        features_raw = np.array([[
            float(data['N']),
            float(data['P']),
            float(data['K']),
            float(data['temperature']),
            float(data['humidity']),
            float(data['ph']),
            float(data['rainfall'])
        ]])
        
        # Apply boundary checks
        n, p, k, temp, hum, ph, rain = features_raw[0]
        if not (0 <= n <= 250): return jsonify({'error': 'Nitrogen must be between 0 and 250 mg/kg.'}), 400
        if not (0 <= p <= 250): return jsonify({'error': 'Phosphorus must be between 0 and 250 mg/kg.'}), 400
        if not (0 <= k <= 300): return jsonify({'error': 'Potassium must be between 0 and 300 mg/kg.'}), 400
        if not (-10 <= temp <= 60): return jsonify({'error': 'Temperature must be between -10°C and 60°C.'}), 400
        if not (0 <= hum <= 100): return jsonify({'error': 'Humidity must be between 0% and 100%.'}), 400
        if not (0 <= ph <= 14): return jsonify({'error': 'Soil pH must be between 0.0 and 14.0.'}), 400
        if not (0 <= rain <= 1000): return jsonify({'error': 'Rainfall must be between 0mm and 1000mm.'}), 400

        # Apply the StandardScaler fitted during training
        features_scaled = scaler.transform(features_raw)
        
        # Predict optimal crop
        prediction = model.predict(features_scaled)[0]
        
        # Get prediction probabilities for comparison chart
        comparison_data = {}
        if hasattr(model, 'predict_proba'):
            probabilities = model.predict_proba(features_scaled)[0]
            classes = model.classes_
            comparison_data = {
                'crops': [str(crop).capitalize() for crop in classes],
                'scores': [float(score * 100) for score in probabilities]
            }
        
        return jsonify({
            'success': True,
            'crop': str(prediction).capitalize(),
            'comparison': comparison_data
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/graph.html')
def graph_page():
    return render_template('graph.html')

if __name__ == '__main__':
    app.run(port=5000, debug=True)