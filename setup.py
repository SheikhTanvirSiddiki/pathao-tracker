from setuptools import setup, find_packages

setup(
    name='pathao-tracker',
    version='1.0.0',
    python_requires='>=3.12,<3.13',
    install_requires=[
        'flask==2.3.3',
        'flask-cors==4.0.0',
        'requests==2.31.0',
        'gunicorn==21.2.0',
    ],
)
