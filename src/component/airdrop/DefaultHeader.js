import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { AppNavbarBrand, AppSidebarToggler } from '@coreui/react';
import logo from '../../assets/img/brand/logo-small.png'

import {
  Button,
  ButtonGroup,
  Row, Col
} from 'reactstrap';

import {setNet} from "../../redux/actions";
import {connect} from 'react-redux';
import {bindActionCreators} from "redux";

const propTypes = {
  children: PropTypes.node,
};

const defaultProps = {};

class DefaultHeader extends Component {
  constructor(props) {
    super(props);

    this.onRadioBtnClick = this.onRadioBtnClick.bind(this);

    this.state = {
      radioSelected: 1
    };
  }

  onRadioBtnClick(radioSelected) {
    const {setNet} = this.props;
    setNet(radioSelected === 1? 'rinkeby' : 'mainnet')
    this.setState({
      radioSelected: radioSelected,
    });
    console.log('onRadioBtnClick - current page:', window.location.pathname);
    this.props.history.push(window.location.pathname);
  }

  render() {

    return (
      <React.Fragment>
        <AppSidebarToggler className="d-lg-none" display="md" mobile />
        <AppNavbarBrand
          full={{ src: logo, width: 150, height: 60, alt: 'Morpheus Labs Logo' }}
          minimized={{ src: logo, width: 60, height: 30, alt: 'Morpheus Labs Logo' }}
        />
        <span className="p-3">
          <Row>
            <Col>
              <ButtonGroup aria-label="First group">
                <Button 
                  color="outline-secondary" 
                  onClick={() => this.onRadioBtnClick(1)} 
                  active={this.state.radioSelected === 1}>
                    Rinkeby Testnet
                </Button>
                <Button 
                  color="outline-secondary" 
                  onClick={() => this.onRadioBtnClick(2)} 
                  active={this.state.radioSelected === 2}>
                    Mainnet
                </Button>
              </ButtonGroup>
            </Col>
          </Row>
        </span>
      </React.Fragment>
    );
  }
}

DefaultHeader.propTypes = propTypes;
DefaultHeader.defaultProps = defaultProps;

function mapStateToProps(state) {
  return {
  }
}

function mapDispatchToProps(dispatch) {
  return {
    setNet: bindActionCreators(setNet, dispatch),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(DefaultHeader);
